mod machine;
#[cfg(windows)]
mod printer;

use std::io::Write;
use std::sync::Mutex;

use tauri::path::BaseDirectory;
use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

struct EngineProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  std::panic::set_hook(Box::new(|info| {
    let path = std::env::temp_dir().join("pos-sinaptex-panic.txt");
    let _ = std::fs::write(path, format!("{info}\n"));
  }));

  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .manage(EngineProcess(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![machine::machine_id]);
  #[cfg(windows)]
  let builder = builder.invoke_handler(tauri::generate_handler![
    machine::machine_id,
    printer::printers,
    printer::print_raw
  ]);

  builder
    .setup(|app| {
      start_engine(app.handle());

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if let RunEvent::Exit = event {
        if let Some(state) = app_handle.try_state::<EngineProcess>() {
          if let Ok(mut guard) = state.0.lock() {
            if let Some(child) = guard.take() {
              let _ = child.kill();
            }
          }
        }
      }
    });
}

fn start_engine(app: &tauri::AppHandle) {
  let data_dir = app
    .path()
    .app_local_data_dir()
    .unwrap_or_else(|_| std::env::temp_dir().join("pos-sinaptex"));
  let _ = std::fs::create_dir_all(&data_dir);

  let db = data_dir.join("accounting.db");
  let backups = data_dir.join("backups");
  let files = data_dir.join("wwwroot").join("uploads").join("logos");
  let _ = std::fs::create_dir_all(&backups);
  let _ = std::fs::create_dir_all(&files);

  if !db.exists() {
    if let Ok(template) = app
      .path()
      .resolve("resources/accounting.db", BaseDirectory::Resource)
    {
      if template.exists() {
        let _ = std::fs::copy(&template, &db);
      }
    }
  }

  let log_path = data_dir.join("engine.log");
  let log_file = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(&log_path)
    .ok();

  let command = match app.shell().sidecar("accounting-engine") {
    Ok(cmd) => cmd,
    Err(e) => {
      log_line(log_file, format!("[spawn-error] sidecar tidak ditemukan: {e}"));
      return;
    }
  };

  let command = command
    .args(["--urls", "http://localhost:5121"])
    .env("ASPNETCORE_ENVIRONMENT", "Production")
    .env("ASPNETCORE_URLS", "http://localhost:5121")
    .env(
      "ConnectionStrings__DefaultConnection",
      format!("Data Source={}", db.display()),
    )
    .env("Backup__Directory", backups.display().to_string())
    .env("FileStorage__Directory", files.display().to_string())
    .current_dir(&data_dir)
    .kill_on_drop(true);

  match command.spawn() {
    Ok((mut rx, child)) => {
      if let Some(state) = app.try_state::<EngineProcess>() {
        if let Ok(mut guard) = state.0.lock() {
          *guard = Some(child);
        }
      }

      let mut file = log_file;
      tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
          let line = match event {
            CommandEvent::Stdout(bytes) => format!("[out] {}", String::from_utf8_lossy(&bytes)),
            CommandEvent::Stderr(bytes) => format!("[err] {}", String::from_utf8_lossy(&bytes)),
            CommandEvent::Error(err) => format!("[error] {err}"),
            CommandEvent::Terminated(payload) => format!("[exit] {payload:?}"),
            _ => continue,
          };
          if let Some(f) = file.as_mut() {
            let _ = writeln!(f, "{line}");
            let _ = f.flush();
          }
        }
      });
    }
    Err(e) => {
      log_line(log_file, format!("[spawn-error] gagal menjalankan engine: {e}"));
    }
  }
}

fn log_line(mut file: Option<std::fs::File>, line: String) {
  if let Some(f) = file.as_mut() {
    let _ = writeln!(f, "{line}");
    let _ = f.flush();
  }
}
