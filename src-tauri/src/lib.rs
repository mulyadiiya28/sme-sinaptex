mod machine;
#[cfg(windows)]
mod printer;

use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![machine::machine_id]);
  #[cfg(windows)]
  let builder = builder.invoke_handler(tauri::generate_handler![
    machine::machine_id,
    printer::printers,
    printer::print_raw
  ]);

  builder
    .setup(|app| {
      // Jalankan engine (sidecar) bila tersedia, tanpa memblokir UI.
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        let _ = handle
          .shell()
          .sidecar("accounting-engine")
          .expect("sidecar accounting-engine")
          .spawn();
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
