// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    WindowEvent,
};
use std::process::{Command, Child};
use std::sync::Mutex;

struct AppState {
    backend_process: Mutex<Option<Child>>,
}

fn main() {
    // System tray menu
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show Window");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide to Tray");
    let analyze = CustomMenuItem::new("analyze".to_string(), "Analyze Repositories");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(analyze)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .manage(AppState {
            backend_process: Mutex::new(None),
        })
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                "analyze" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                    // Emit event to frontend to trigger analysis
                    window.emit("trigger-analyze", {}).unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            WindowEvent::CloseRequested { api, .. } => {
                // Prevent window from closing, just hide it instead
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            check_backend_status,
            minimize_to_tray
        ])
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            
            // Start minimized if user preference
            #[cfg(target_os = "windows")]
            {
                window.hide().unwrap();
            }
            
            // Start the backend server
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_backend_server(app_handle).await {
                    eprintln!("Failed to start backend: {}", e);
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn start_backend() -> Result<String, String> {
    // Backend will be started automatically on app launch
    Ok("Backend starting...".to_string())
}

#[tauri::command]
async fn stop_backend(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let mut process = state.backend_process.lock().unwrap();
    if let Some(mut child) = process.take() {
        child.kill().map_err(|e| e.to_string())?;
        Ok("Backend stopped".to_string())
    } else {
        Err("Backend not running".to_string())
    }
}

#[tauri::command]
async fn check_backend_status() -> Result<bool, String> {
    // Check if backend is responding
    match reqwest::get("http://localhost:3001/health").await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
async fn minimize_to_tray(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

async fn start_backend_server(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get the resource path for the backend
    let resource_path = app.path_resolver()
        .resolve_resource("backend")
        .expect("failed to resolve resource");
    
    // Start Node.js backend process
    let backend_dir = resource_path.parent().unwrap();
    
    #[cfg(target_os = "windows")]
    let node_cmd = "node.exe";
    #[cfg(not(target_os = "windows"))]
    let node_cmd = "node";
    
    let child = Command::new(node_cmd)
        .current_dir(backend_dir.join("backend"))
        .arg("src/index.js")
        .env("NODE_ENV", "production")
        .env("PORT", "3001")
        .spawn()?;
    
    // Store process handle
    if let Some(state) = app.try_state::<AppState>() {
        *state.backend_process.lock().unwrap() = Some(child);
    }
    
    // Wait for backend to be ready
    for _ in 0..30 {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        if reqwest::get("http://localhost:3001/health").await.is_ok() {
            println!("Backend is ready!");
            break;
        }
    }
    
    Ok(())
}


