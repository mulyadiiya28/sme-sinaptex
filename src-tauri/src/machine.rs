/// Sidik mesin yang stabil di perangkat ini (nama komputer + serial volume sistem).
/// Bukan rahasia: hanya dipakai agar key aktivasi tidak pindah diam-diam ke PC lain.
#[tauri::command]
pub fn machine_id() -> String {
    let nama = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown".into());
    format!("{:016x}", fnv1a64(&format!("{nama}|{}", system_volume())))
}

fn fnv1a64(data: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in data.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[cfg(windows)]
fn system_volume() -> String {
    use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;
    let root: Vec<u16> = "C:\\\0".encode_utf16().collect();
    let mut serial = 0u32;
    let ok = unsafe {
        GetVolumeInformationW(
            root.as_ptr(),
            std::ptr::null_mut(),
            0,
            &mut serial,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
        )
    };
    if ok == 0 {
        return "no-volume".into();
    }
    format!("{serial:08X}")
}

#[cfg(not(windows))]
fn system_volume() -> String {
    "no-volume".into()
}
