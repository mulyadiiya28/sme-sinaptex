# Specification: Printer ESC/POS (P1.1 - High Priority)

**Status:** ⏭️ Development Phase  
**Fase:** P1 - Operasional (Penyempurnaan Toko)  
**Priority:** ⭐⭐⭐⭐ High  
**Estimasi:** 1-2 minggu

---

## 📋 Overview

**Masalah:** Browser print (`window.print()`) berfungsi, tapi kasir harus klik "Print" di dialog browser (tidak seamless), tidak bisa auto-print, dan setting printer per transaksi.

**Solusi:** Printer ESC/POS native - direct print ke thermal printer tanpa browser dialog.

---

## 🎯 Requirements

### User Stories

1. **AS A** kasir  
   **I WANT TO** print struk langsung ke thermal printer  
   **SO THAT** tidak perlu klik "Print" di browser dialog

2. **AS A** owner  
   **I WANT TO** konfigurasi printer di Pengaturan  
   **SO THAT** bisa pilih printer dan setting print

3. **AS A** kasir  
   **I WANT TO** toggle auto-print di Pengaturan  
   **SO THAT** struk auto-print tanpa klik lagi

4. **AS A** IT admin  
   **I WANT TO** print test page  
   **SO THAT** bisa verifikasi printer working

---

## 🏗️ Architecture

### Frontend (POS-Sinaptex)

```
src/
  components/
    kasir/
      checkout-dialog.tsx          # Add auto-print toggle
      print-preview.tsx            # (Optional: preview before print)
    pengaturan/
      printer-settings.tsx         # New: Printer configuration
  hooks/
    usePrinter.ts                  # New: ESC/POS printer hook
  lib/
    printer/
      escpos.ts                    # New: ESC/POS command builder
      printer.ts                   # New: Printer manager
  services/
    printer-service.ts             # New: Print queue management
```

### Backend (Accounting Engine)

**No changes needed** - Backend tidak perlu modifikasi untuk printer.

---

## 🔧 Implementation Plan

### Phase 1: Printer Detection & Configuration (3-5 hari)

#### 1.1 Printer Detection
```typescript
// lib/printer/printer.ts
export interface PrinterInfo {
  name: string;
  isDefault: boolean;
  status: 'online' | 'offline' | 'error';
  capabilities: {
    hasCut: boolean;
    hasrawer: boolean;
    supportedPapers: string[];
  };
}

export async function getPrinters(): Promise<PrinterInfo[]> {
  // Use tauri-plugin-printer or electron-printer
  // List all available printers
}

export async function getPrinterStatus(printerName: string): Promise<PrinterInfo> {
  // Get detailed status
}
```

#### 1.2 Printer Settings UI
```typescript
// components/pengaturan/printer-settings.tsx
interface PrinterSettings {
  defaultPrinter: string;
  autoPrint: boolean;
  printCopies: number;
  cutAfterPrint: boolean;
  openDrawerAfterPrint: boolean;
}

export function PrinterSettings() {
  const [settings, setSettings] = useState<PrinterSettings>({
    defaultPrinter: '',
    autoPrint: false,
    printCopies: 1,
    cutAfterPrint: true,
    openDrawerAfterPrint: false,
  });

  const [printers, setPrinters] = useState<PrinterInfo[]>([]);

  // Load printers on mount
  useEffect(() => {
    loadPrinters();
  }, []);

  return (
    <Panel title="Printer ESC/POS">
      <Form>
        <Select
          label="Default Printer"
          value={settings.defaultPrinter}
          onChange={handlePrinterChange}
          options={printers.map(p => ({ value: p.name, label: p.name }))}
        />
        
        <Toggle
          label="Auto-Print Struk"
          value={settings.autoPrint}
          onChange={handleAutoPrintChange}
        />
        
        <NumberInput
          label="Jumlah Copy"
          value={settings.printCopies}
          min={1}
          max={5}
          onChange={handleCopiesChange}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Toggle label="Cut After Print" value={settings.cutAfterPrint} />
          <Toggle label="Open Drawer" value={settings.openDrawerAfterPrint} />
        </div>
      </Form>
      
      <Button onClick={testPrint}>Print Test Page</Button>
    </Panel>
  );
}
```

### Phase 2: ESC/POS Command Builder (2-3 hari)

```typescript
// lib/printer/escpos.ts
// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';

export const Commands = {
  // Initialization
  INIT: '\x1B\x40',
  
  // Text formatting
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  INVERT_ON: '\x1B\x40\x7B\x01',
  INVERT_OFF: '\x1B\x40\x7B\x00',
  
  // Alignment
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  
  // Font
  FONT_A: '\x1B\x4D\x00',
  FONT_B: '\x1B\x4D\x01',
  
  // Size
  SIZE_NORMAL: '\x1D\x21\x00',
  SIZE_2X_HEIGHT: '\x1D\x21\x10',
  SIZE_2X_WIDTH: '\x1D\x21\x20',
  SIZE_2X_BOTH: '\x1D\x21\x30',
  
  // Cut
  CUT_FULL: '\x1D\x56\x00',
  CUT_PARTIAL: '\x1D\x56\x01',
  
  // Cash Drawer
  DRAWER_KICK_0: '\x1B\x70\x00',
  DRAWER_KICK_1: '\x1B\x70\x01',
  DRAWER_KICK_2: '\x1B\x70\x02',
  
  // Paper feed
  FEED: '\x1B\x64',
  FEED_N_LINES: (n: number) => `${ESC}d${String.fromCharCode(n)}`,
  
  // Print and feed
  PRINT_AND_FEED: '\x1B\x64\x05',
};

// Helper functions
export function text(content: string, options?: {
  bold?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  size?: 'normal' | '2x';
}): string {
  let cmd = '';
  
  // Set alignment
  if (options?.align === 'center') cmd += Commands.ALIGN_CENTER;
  else if (options?.align === 'right') cmd += Commands.ALIGN_RIGHT;
  else cmd += Commands.ALIGN_LEFT;
  
  // Set size
  if (options?.size === '2x') cmd += Commands.SIZE_2X_BOTH;
  
  // Set bold
  if (options?.bold) cmd += Commands.BOLD_ON;
  
  // Set underline
  if (options?.underline) cmd += Commands.UNDERLINE_ON;
  
  cmd += content;
  
  // Reset formatting
  cmd += Commands.INIT;
  
  return cmd;
}

export function barcode(code: string, type: 'EAN13' | 'CODE128' = 'CODE128'): string {
  let cmd = '';
  
  if (type === 'EAN13') {
    cmd += `${ESC}k\x43${String.fromCharCode(code.length)}${code}`;
  } else {
    cmd += `${ESC}k\x42${String.fromCharCode(code.length)}${code}`;
  }
  
  return cmd;
}

export function qrCode(data: string, size: number = 6, mode: 'H' | 'Q' | 'M' | 'L' = 'H'): string {
  // GS ( k n1 n2 m d1...dn
  let cmd = '';
  cmd += GS;
  cmd += '(';
  cmd += 'k';
  cmd += String.fromCharCode(4);  // n1, n2 = 4
  cmd += String.fromCharCode(49);
  cmd += mode;  // Error correction
  cmd += String.fromCharCode(size);  // Size
  cmd += String.fromCharCode(data.length);
  cmd += data;
  
  return cmd;
}

export function image(bitmap: Uint8Array): string {
  // Image command: GS ( L nL nH wL wH d1...dn
  // Simplified for now
  return '';
}

export function cut(mode: 'full' | 'partial' = 'full'): string {
  return mode === 'full' ? Commands.CUT_FULL : Commands.CUT_PARTIAL;
}

export function openDrawer(): string {
  return Commands.DRAWER_KICK_0;
}

// Build complete receipt
export function buildReceipt(data: ReceiptData, settings: PrinterSettings): string {
  let cmd = Commands.INIT;
  
  // Header
  cmd += text(data.storeName, { size: '2x', align: 'center', bold: true });
  cmd += text('Jl. Merdeka No. 10', { align: 'center' });
  cmd += text(`Telp: ${data.storePhone}`, { align: 'center' });
  cmd += text('======================', { align: 'center' });
  cmd += Commands.FEED_N_LINES(1);
  
  // Transaction info
  cmd += text(`No: ${data.transactionNo}`, { align: 'center' });
  cmd += text(`Date: ${data.date}`, { align: 'center' });
  cmd += text(`Cashier: ${data.cashier}`, { align: 'center' });
  cmd += Commands.FEED_N_LINES(1);
  
  // Items
  cmd += text('Qty  Item           Price    Total', { bold: true });
  cmd += text('-----------------------------', { align: 'center' });
  
  data.items.forEach(item => {
    cmd += text(`${item.qty.toString().padStart(4)} ${item.name.padEnd(14)} ${item.price.toString().padStart(6)} ${item.total.toString().padStart(6)}`);
  });
  
  cmd += text('-----------------------------', { align: 'center' });
  
  // Totals
  cmd += text(`Subtotal:  ${formatRupiah(data.subtotal)}`, { align: 'right' });
  cmd += text(`Diskon:    ${formatRupiah(data.discount)}`, { align: 'right' });
  cmd += text(`Pajak:     ${formatRupiah(data.tax)}`, { align: 'right' });
  cmd += text('-----------------------------', { align: 'center' });
  cmd += text(`TOTAL:     ${formatRupiah(data.total)}`, { align: 'right', bold: true });
  cmd += text(`Bayar:     ${formatRupiah(data.paid)}`, { align: 'right' });
  cmd += text(`Kembalian: ${formatRupiah(data.change)}`, { align: 'right' });
  cmd += Commands.FEED_N_LINES(1);
  
  // Footer
  cmd += text('Terima Kasih', { size: '2x', align: 'center', bold: true });
  cmd += text('Kunjungi Lagi!', { align: 'center' });
  cmd += Commands.FEED_N_LINES(1);
  
  // Barcode (transaction number)
  if (data.transactionNo) {
    cmd += Commands.ALIGN_CENTER;
    cmd += barcode(data.transactionNo, 'CODE128');
    cmd += Commands.FEED_N_LINES(1);
  }
  
  // QR Code (optional)
  if (data.storeQrCode) {
    cmd += Commands.ALIGN_CENTER;
    cmd += qrCode(data.storeQrCode);
    cmd += Commands.FEED_N_LINES(1);
  }
  
  // Cut paper
  if (settings.cutAfterPrint) {
    cmd += cut();
  }
  
  // Open cash drawer
  if (settings.openDrawerAfterPrint) {
    cmd += openDrawer();
  }
  
  return cmd;
}
```

### Phase 3: Print Service & Integration (2-3 hari)

```typescript
// services/printer-service.ts
export class PrinterService {
  private printerName: string = '';
  private settings: PrinterSettings = {
    defaultPrinter: '',
    autoPrint: false,
    printCopies: 1,
    cutAfterPrint: true,
    openDrawerAfterPrint: false,
  };

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    const saved = localStorage.getItem('printer-settings');
    if (saved) {
      this.settings = JSON.parse(saved);
      this.printerName = this.settings.defaultPrinter;
    }
  }

  public async getPrinters(): Promise<PrinterInfo[]> {
    return getPrinters();
  }

  public async selectPrinter(name: string) {
    this.printerName = name;
    this.settings.defaultPrinter = name;
    this.saveSettings();
  }

  public async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    if (!this.printerName) {
      throw new Error('No printer selected');
    }

    const escposCommands = buildReceipt(receiptData, this.settings);
    const success = await printRaw(this.printerName, escposCommands);
    
    if (success) {
      // If auto-print is ON, we're done
      // If auto-print is OFF, user will click print button (browser fallback)
    }

    return success;
  }

  public async printTestPage(): Promise<boolean> {
    const testReceipt: ReceiptData = {
      storeName: 'TEST TOKO',
      storePhone: '021-12345678',
      transactionNo: 'TEST-001',
      date: new Date().toLocaleString(),
      cashier: 'TEST USER',
      items: [
        { name: 'Test Item 1', qty: 2, price: 10000, total: 20000 },
        { name: 'Test Item 2', qty: 1, price: 5000, total: 5000 },
      ],
      subtotal: 25000,
      discount: 0,
      tax: 2750,
      total: 27750,
      paid: 30000,
      change: 2250,
      storeQrCode: 'https://example.com',
    };

    return this.printReceipt(testReceipt);
  }

  private saveSettings() {
    localStorage.setItem('printer-settings', JSON.stringify(this.settings));
  }
}

// Global instance
export const printerService = new PrinterService();
```

### Phase 4: Integration with Checkout

```typescript
// components/kasir/checkout-dialog.tsx
interface CheckoutProps {
  cart: Cart;
  onCheckout: (payment: Payment) => void;
  onSuccess: (transaction: Transaction) => void;
}

export function CheckoutDialog({ cart, onCheckout, onSuccess }: CheckoutProps) {
  const printer = usePrinter();
  
  const [autoPrint, setAutoPrint] = useState(true);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  
  const handleCheckout = async (payment: Payment) => {
    // Process checkout
    const transaction = await onCheckout(payment);
    
    // Build receipt
    const receipt = buildReceiptData(transaction, cart);
    
    // Print
    if (autoPrint) {
      try {
        await printer.printReceipt(receipt);
        // Auto-print done, no need for browser print
      } catch (error) {
        console.error('Auto-print failed:', error);
        // Fallback to browser print
        window.print();
      }
    } else {
      // User will manually print
      window.print();
    }
    
    onSuccess(transaction);
  };

  return (
    <Dialog title="Pembayaran">
      {/* ... payment form ... */}
      
      <div className="settings-panel">
        <Toggle
          label="Auto-Print Struk"
          value={autoPrint}
          onChange={setAutoPrint}
        />
        
        <Button variant="secondary" onClick={() => setShowPrintSettings(true)}>
          Konfigurasi Printer
        </Button>
      </div>
      
      {/* ... buttons ... */}
      
      {showPrintSettings && (
        <PrinterSettingsDialog 
          onClose={() => setShowPrintSettings(false)} 
        />
      )}
    </Dialog>
  );
}
```

---

## 🧪 Testing

### Test Cases

#### TC-1: Printer Detection
1. Buka Pengaturan → Tab Printer
2. Klik "Deteksi Printer"
3. **Expected:** List printer muncul (minimal 1 printer)

#### TC-2: Select Printer
1. Pilih printer dari dropdown
2. **Expected:** Printer tersimpan di localStorage

#### TC-3: Print Test Page
1. Klik "Print Test Page"
2. **Expected:** Thermal printer keluarkan test page dengan format:

```
======================
TEST TOKO
Jl. Merdeka No. 10
======================

Test Item 1       x2 Rp 10.000
Test Item 2       x1 Rp 5.000

TOTAL: Rp 27.750
Bayar: Rp 30.000
Kembalian: Rp 2.250

Terima Kasih!
======================
```

#### TC-4: Auto-Print
1. Enable "Auto-Print Struk"
2. Checkout transaksi
3. **Expected:** Struk auto-print tanpa klik browser dialog

#### TC-5: Manual Print (Fallback)
1. Disable "Auto-Print Struk"
2. Checkout transaksi
3. **Expected:** Browser print dialog muncul

#### TC-6: Cut Paper
1. Enable "Cut After Print"
2. Print receipt
3. **Expected:** Kertas terpotong otomatis

#### TC-7: Cash Drawer
1. Enable "Open Drawer"
2. Print receipt
3. **Expected:** Laci kas terbuka otomatis

---

## 📦 Dependencies

### Tauri Plugin (Recommended)
```bash
npm install @tauri-apps/plugin-printer
```

### Alternative: ESC/POS Library (Untuk USB/Serial direct)
```bash
npm install escpos
```

### Package.json Dependencies
```json
{
  "dependencies": {
    "@tauri-apps/plugin-printer": "^2.0.0"
  }
}
```

---

## 🎨 Receipt Template

### Thermal Receipt (80mm width)

```
┌────────────────────────┐
│   TOKO ABC             │
│  Jl. Merdeka No. 10    │
│   Telp: 021-12345678   │
├────────────────────────┤
│ No: SALE-00001         │
│ Date: 12/11/2026 15:30 │
│ Cashier: Budi          │
├────────────────────────┤
│ Qty Item          Price  │
│  2  Susu Ultra      15K │
│  1  Kopi Kapal      18K │
├────────────────────────┤
│ subtotal:         33.000 │
│ diskon:            0     │
│ pajak (11%):       3.630 │
│ ─────────────────────── │
│ TOTAL:            36.630 │
│ BAYAR:            50.000 │
│ KEMBALIAN:        13.370 │
├────────────────────────┤
│  Terima Kasih!         │
│   Kunjungi Lagi!       │
├────────────────────────┤
│   [BARCODE: SALE-00001]│
├────────────────────────┤
│   [QR CODE]            │
├────────────────────────┤
│  [CUT PAPER]           │
└────────────────────────┘
```

---

## 📊 Implementation Checklist

- [ ] **Phase 1: Printer Detection & Configuration**
  - [ ] `lib/printer/printer.ts` - Printer detection
  - [ ] `components/pengaturan/printer-settings.tsx` - Settings UI
  - [ ] Load/store printer settings (localStorage)
  
- [ ] **Phase 2: ESC/POS Commands**
  - [ ] `lib/printer/escpos.ts` - Command builder
  - [ ] Text formatting (bold, underline, size, alignment)
  - [ ] Barcode (EAN13, CODE128)
  - [ ] QR Code
  - [ ] Cut paper
  - [ ] Cash drawer
  
- [ ] **Phase 3: Print Service**
  - [ ] `services/printer-service.ts` - Service class
  - [ ] Print raw ESC/POS commands
  - [ ] Print test page
  - [ ] Error handling
  
- [ ] **Phase 4: Integration**
  - [ ] `components/kasir/checkout-dialog.tsx` - Auto-print toggle
  - [ ] `components/kasir/struk.tsx` - Receipt generation
  - [ ] Fallback to browser print
  
- [ ] **Testing**
  - [ ] TC-1: Printer detection
  - [ ] TC-2: Select printer
  - [ ] TC-3: Print test page
  - [ ] TC-4: Auto-print
  - [ ] TC-5: Manual print
  - [ ] TC-6: Cut paper
  - [ ] TC-7: Cash drawer

---

## 🚦 Priority: ⭐⭐⭐⭐ HIGH

**Alasan High Priority:**
1. Browser print **tidak seamless** - kasir harus klik dialog setiap transaksi
2. Tidak bisa auto-print - slow workflow
3. Setting printer per transaksi - ribet
4. Thermal printer = standard di toko retail
5. UX improvement signifikan

**Waktu implementasi:** 1-2 minggu

---

**Status:** Ready for development 🚀
