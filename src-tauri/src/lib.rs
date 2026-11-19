mod machine;
#[cfg(windows)]
mod printer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default().invoke_handler(tauri::generate_handler![machine::machine_id]);
  #[cfg(windows)]
  let builder = builder.invoke_handler(tauri::generate_handler![
    machine::machine_id,
    printer::printers,
    printer::print_raw
  ]);

  builder
    .setup(|app| {
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
