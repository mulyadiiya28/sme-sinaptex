use serde::Serialize;
use std::ffi::c_void;
use windows_sys::Win32::Graphics::Printing::{
    ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, GetDefaultPrinterW, OpenPrinterW,
    StartDocPrinterW, StartPagePrinter, WritePrinter, DOC_INFO_1W, PRINTER_ENUM_CONNECTIONS,
    PRINTER_ENUM_LOCAL, PRINTER_HANDLE, PRINTER_INFO_4W,
};

#[derive(Serialize)]
pub struct PrinterInfo {
    name: String,
    #[serde(rename = "isDefault")]
    is_default: bool,
}

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn from_wide(pointer: *const u16) -> String {
    if pointer.is_null() {
        return String::new();
    }
    let mut length = 0usize;
    unsafe {
        while *pointer.add(length) != 0 {
            length += 1;
        }
        String::from_utf16_lossy(std::slice::from_raw_parts(pointer, length))
    }
}

fn last_error(context: &str) -> String {
    format!("{context} gagal: {}", std::io::Error::last_os_error())
}

fn default_printer() -> Option<String> {
    let mut length = 0u32;
    unsafe {
        GetDefaultPrinterW(std::ptr::null_mut(), &mut length);
    }
    if length == 0 {
        return None;
    }
    let mut buffer = vec![0u16; length as usize];
    let ok = unsafe { GetDefaultPrinterW(buffer.as_mut_ptr(), &mut length) };
    if ok == 0 {
        return None;
    }
    Some(from_wide(buffer.as_ptr()))
}

#[tauri::command]
pub fn printers() -> Result<Vec<PrinterInfo>, String> {
    let mut needed = 0u32;
    let mut returned = 0u32;
    unsafe {
        EnumPrintersW(
            PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
            std::ptr::null(),
            4,
            std::ptr::null_mut(),
            0,
            &mut needed,
            &mut returned,
        );
    }
    if needed == 0 {
        return Ok(Vec::new());
    }

    let word = std::mem::size_of::<usize>();
    let mut buffer = vec![0usize; (needed as usize + word - 1) / word];
    let ok = unsafe {
        EnumPrintersW(
            PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
            std::ptr::null(),
            4,
            buffer.as_mut_ptr() as *mut u8,
            needed,
            &mut needed,
            &mut returned,
        )
    };
    if ok == 0 {
        return Err(last_error("EnumPrintersW"));
    }

    let default = default_printer();
    let entries = unsafe {
        std::slice::from_raw_parts(buffer.as_ptr() as *const PRINTER_INFO_4W, returned as usize)
    };
    let mut hasil = Vec::with_capacity(entries.len());
    for entry in entries {
        let name = from_wide(entry.pPrinterName);
        if name.is_empty() {
            continue;
        }
        hasil.push(PrinterInfo {
            is_default: default.as_deref() == Some(name.as_str()),
            name,
        });
    }
    hasil.sort_by(|a, b| b.is_default.cmp(&a.is_default).then(a.name.cmp(&b.name)));
    Ok(hasil)
}

#[tauri::command]
pub fn print_raw(printer: String, data: Vec<u8>) -> Result<(), String> {
    if printer.trim().is_empty() {
        return Err("Printer belum dipilih".into());
    }
    if data.is_empty() {
        return Err("Data cetak kosong".into());
    }

    let name = wide(&printer);
    let mut handle = PRINTER_HANDLE::default();
    let ok = unsafe { OpenPrinterW(name.as_ptr(), &mut handle, std::ptr::null()) };
    if ok == 0 {
        return Err(last_error("OpenPrinterW"));
    }

    let doc_name = wide("POS-Sinaptex");
    let datatype = wide("RAW");
    let doc_info = DOC_INFO_1W {
        pDocName: doc_name.as_ptr() as *mut u16,
        pOutputFile: std::ptr::null_mut(),
        pDatatype: datatype.as_ptr() as *mut u16,
    };

    let job = unsafe { StartDocPrinterW(handle, 1, &doc_info) };
    if job == 0 {
        unsafe {
            ClosePrinter(handle);
        }
        return Err(last_error("StartDocPrinterW"));
    }

    let mut hasil = Ok(());
    if unsafe { StartPagePrinter(handle) } == 0 {
        hasil = Err(last_error("StartPagePrinter"));
    } else {
        let mut written = 0u32;
        let ok = unsafe {
            WritePrinter(
                handle,
                data.as_ptr() as *const c_void,
                data.len() as u32,
                &mut written,
            )
        };
        if ok == 0 {
            hasil = Err(last_error("WritePrinter"));
        } else if written as usize != data.len() {
            hasil = Err(format!(
                "Printer hanya menerima {written} dari {} byte",
                data.len()
            ));
        }
        unsafe {
            EndPagePrinter(handle);
        }
    }
    unsafe {
        EndDocPrinter(handle);
        ClosePrinter(handle);
    }
    hasil
}
