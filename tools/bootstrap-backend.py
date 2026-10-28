"""Bootstrap data awal untuk backend Accounting Engine (SQLite).

Membuat satu tenant, satu pengguna pemilik, RBAC untuk peran tersebut,
akun kas, dan periode fiskal berjalan. Aman dijalankan berulang kali:
baris yang sudah ada dilewati, bukan ditulis ulang.

Jalankan setelah `dotnet ef database update`:

    python tools/bootstrap-backend.py
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sqlite3
import sys

try:
    import bcrypt
except ImportError:  # pragma: no cover
    sys.exit("butuh paket bcrypt: pip install bcrypt")

DEFAULT_DB = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "backend",
    "src",
    "AccountingEngine.Api",
    "accounting.db",
)

PERMISSIONS = [
    "users.manage",
    "settings.manage",
    "reports.view_all",
    "sales.create",
    "purchases.create",
    "sales.view_all",
    "purchases.view_all",
    "cash.manage",
    "inventory.manage",
    "loans.manage",
    "branches.manage",
    "roles.manage",
]

CASH_ACCOUNTS = [
    ("Kas Tunai", "1121", "Kas kecil toko (akun kas default)", True),
    ("Kas Bank", "1111", "Bank BCA", False),
]

STAMP = "2026-01-01 00:00:00"


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat(sep=" ")[:19]


def guid() -> str:
    import uuid

    return str(uuid.uuid4())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=DEFAULT_DB, help="path ke accounting.db")
    parser.add_argument("--business-id", default="toko-utama")
    parser.add_argument("--business-name", default="Toko Utama")
    parser.add_argument("--username", default="pemilik")
    parser.add_argument("--password", default="pemilik123")
    parser.add_argument("--full-name", default="Pemilik Toko")
    parser.add_argument("--role-name", default="Pemilik")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        sys.exit(f"database tidak ditemukan: {args.db}\njalankan `dotnet ef database update` dulu")

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()
    stamp = now()
    created: list[str] = []

    def ensure(table: str, column: str, value: str, row: dict) -> None:
        found = cur.execute(
            f"SELECT Id FROM {table} WHERE {column} = ? LIMIT 1", (value,)
        ).fetchone()
        if found:
            return
        cur.execute(
            f"INSERT INTO {table} ({', '.join(row)}) VALUES ({', '.join('?' * len(row))})",
            list(row.values()),
        )
        created.append(f"{table}: {row.get('Name') or row.get('Username') or row.get('Code') or value}")

    ensure(
        "Businesses",
        "Id",
        args.business_id,
        {
            "Id": args.business_id,
            "Name": args.business_name,
            "LegalName": None,
            "TaxId": None,
            "BaseCurrency": "IDR",
            "AccountingBasis": "Accrual",
            "AccountingStartDate": "2026-01-01 00:00:00",
            "RoundingMode": "HALF_UP",
            "IsActive": 1,
            "BusinessId": args.business_id,
            "CreatedAt": stamp,
            "UpdatedAt": stamp,
            "Version": 1,
            "BranchCode": "HQ",
            "IsHeadquarters": 1,
            "ParentBusinessId": None,
        },
    )

    permission_ids: dict[str, str] = {}
    for code in PERMISSIONS:
        row = cur.execute("SELECT Id FROM Permissions WHERE Code = ?", (code,)).fetchone()
        if row:
            permission_ids[code] = row[0]
            continue
        pid = guid()
        cur.execute(
            "INSERT INTO Permissions (Id, Code, BusinessId, CreatedAt, UpdatedAt, Version)"
            " VALUES (?, ?, '', ?, ?, 1)",
            (pid, code, stamp, stamp),
        )
        permission_ids[code] = pid
        created.append(f"Permissions: {code}")

    role_row = cur.execute(
        "SELECT Id FROM Roles WHERE BusinessId = ? AND Name = ?", (args.business_id, args.role_name)
    ).fetchone()
    if role_row:
        role_id = role_row[0]
    else:
        role_id = guid()
        cur.execute(
            "INSERT INTO Roles (Id, Name, Description, BusinessId, CreatedAt, UpdatedAt, Version)"
            " VALUES (?, ?, ?, ?, ?, ?, 1)",
            (role_id, args.role_name, "Peran pemilik toko", args.business_id, stamp, stamp),
        )
        created.append(f"Roles: {args.role_name}")

    for code, pid in permission_ids.items():
        exists = cur.execute(
            "SELECT Id FROM RolePermissions WHERE RoleId = ? AND PermissionId = ?", (role_id, pid)
        ).fetchone()
        if exists:
            continue
        cur.execute(
            "INSERT INTO RolePermissions (Id, RoleId, PermissionId, BusinessId, CreatedAt, UpdatedAt, Version)"
            " VALUES (?, ?, ?, ?, ?, ?, 1)",
            (guid(), role_id, pid, args.business_id, stamp, stamp),
        )

    user_row = cur.execute("SELECT Id FROM Users WHERE Username = ?", (args.username,)).fetchone()
    if user_row:
        user_id = user_row[0]
    else:
        user_id = guid()
        password_hash = bcrypt.hashpw(
            args.password.encode("utf-8"), bcrypt.gensalt(rounds=11)
        ).decode("ascii")
        cur.execute(
            "INSERT INTO Users (Id, Username, FullName, AuthorityLevel, IsActive, PasswordHash,"
            " BusinessId, CreatedAt, UpdatedAt, Version, Email)"
            " VALUES (?, ?, ?, 99, 1, ?, ?, ?, ?, 1, NULL)",
            (
                user_id,
                args.username,
                args.full_name,
                password_hash,
                args.business_id,
                stamp,
                stamp,
            ),
        )
        created.append(f"Users: {args.username}")

    link = cur.execute(
        "SELECT Id FROM UserRoles WHERE UserId = ? AND RoleId = ?", (user_id, role_id)
    ).fetchone()
    if not link:
        cur.execute(
            "INSERT INTO UserRoles (Id, UserId, RoleId, BranchId, BusinessId, CreatedAt, UpdatedAt, Version)"
            " VALUES (?, ?, ?, NULL, ?, ?, ?, 1)",
            (guid(), user_id, role_id, args.business_id, stamp, stamp),
        )
        created.append(f"UserRoles: {args.username} -> {args.role_name}")

    for name, code, description, is_default in CASH_ACCOUNTS:
        exists = cur.execute(
            "SELECT Id FROM CashAccounts WHERE BusinessId = ? AND AccountCode = ?",
            (args.business_id, code),
        ).fetchone()
        if exists:
            continue
        cur.execute(
            "INSERT INTO CashAccounts (Id, Name, AccountCode, Description, NormalBalance,"
            " IsDefault, IsActive, BusinessId, CreatedAt, UpdatedAt, Version)"
            " VALUES (?, ?, ?, ?, 'DEBIT', ?, 1, ?, ?, ?, 1)",
            (
                guid(),
                name,
                code,
                description,
                1 if is_default else 0,
                args.business_id,
                stamp,
                stamp,
            ),
        )
        created.append(f"CashAccounts: {name} ({code})")

    today = dt.date.today()
    period_start = today.replace(day=1)
    next_month = (period_start.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    period_end = next_month - dt.timedelta(days=1)
    period_name = period_start.strftime("%B %Y")
    exists = cur.execute(
        "SELECT Id FROM FiscalPeriods WHERE BusinessId = ? AND Name = ?",
        (args.business_id, period_name),
    ).fetchone()
    if not exists:
        cur.execute(
            "INSERT INTO FiscalPeriods (Id, Name, StartDate, EndDate, Status, BusinessId,"
            " CreatedAt, UpdatedAt, Version)"
            " VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?, 1)",
            (
                guid(),
                period_name,
                period_start.strftime("%Y-%m-%d 00:00:00"),
                period_end.strftime("%Y-%m-%d 00:00:00"),
                args.business_id,
                stamp,
                stamp,
            ),
        )
        created.append(f"FiscalPeriods: {period_name} (OPEN)")

    conn.commit()
    conn.close()

    print(f"database : {args.db}")
    print(f"tenant   : {args.business_id} ({args.business_name})")
    print(f"login    : {args.username} / {args.password}")
    if created:
        print("dibuat:")
        for line in created:
            print(f"  + {line}")
    else:
        print("dibuat: (tidak ada perubahan)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
