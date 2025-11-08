// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    WindowEvent,
};

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

            // Show window initially (user can minimize to tray if desired)
            window.show().unwrap();
            window.set_focus().unwrap();

            // Enable devtools in development
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }

            println!("RepoResume Desktop starting...");
            println!("Window visible: {}", window.is_visible().unwrap());

            // Start the backend server
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                println!("Starting backend server...");
                if let Err(e) = start_backend_server(app_handle).await {
                    eprintln!("Failed to start backend: {}", e);
                    eprintln!(
                        "Note: You can start the backend manually with: cd backend && npm start"
                    );
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

fn find_node_executable(default_cmd: &str) -> Option<String> {
    // First try the default command (should work if in PATH)
    if Command::new(default_cmd).arg("--version").output().is_ok() {
        return Some(default_cmd.to_string());
    }

    // Try common Windows installation paths
    #[cfg(target_os = "windows")]
    {
        let common_paths = vec![
            r"C:\Program Files\nodejs\node.exe",
            r"C:\Program Files (x86)\nodejs\node.exe",
            r"C:\nodejs\node.exe",
        ];

        for path in common_paths {
            if std::path::Path::new(path).exists() {
                if Command::new(path).arg("--version").output().is_ok() {
                    return Some(path.to_string());
                }
            }
        }

        // Try using 'where' command
        if let Ok(output) = Command::new("where").arg("node").output() {
            if let Ok(path_str) = String::from_utf8(output.stdout) {
                let path = path_str.lines().next().unwrap_or("").trim();
                if !path.is_empty() && std::path::Path::new(path).exists() {
                    return Some(path.to_string());
                }
            }
        }
    }

    // Try common Unix paths
    #[cfg(not(target_os = "windows"))]
    {
        let common_paths = vec![
            "/usr/bin/node",
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node",
        ];

        for path in common_paths {
            if std::path::Path::new(path).exists() {
                if Command::new(path).arg("--version").output().is_ok() {
                    return Some(path.to_string());
                }
            }
        }
    }

    None
}

async fn start_backend_server(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Check if backend is already running
    if reqwest::get("http://localhost:3001/health").await.is_ok() {
        println!("Backend is already running!");
        return Ok(());
    }

    // Try to find Node.js
    #[cfg(target_os = "windows")]
    let node_cmd = "node.exe";
    #[cfg(not(target_os = "windows"))]
    let node_cmd = "node";

    // Try to find backend relative to executable
    let exe_path = std::env::current_exe()?;
    let exe_dir = exe_path.parent().unwrap();

    println!("Executable directory: {:?}", exe_dir);

    // Look for backend in common locations
    // From target/release/, we need to go up 4 levels to reach project root:
    // target/release/ -> target/ -> src-tauri/ -> desktop/ -> project root
    let project_root = exe_dir.join("../../../../");
    let backend_paths = vec![
        project_root.join("backend/src/index.js"), // From target/release (correct path)
        exe_dir.join("../../../../backend/src/index.js"), // Explicit alternative
        exe_dir.join("../../../backend/src/index.js"), // If in different location
        exe_dir.join("../../backend/src/index.js"), // Alternative path
        exe_dir.join("../backend/src/index.js"),   // If bundled
        exe_dir.join("backend/src/index.js"),      // If in same directory
    ];

    let mut backend_found = false;
    let mut backend_dir = exe_dir.to_path_buf();
    let mut backend_script_path = String::new();

    for backend_path in &backend_paths {
        if backend_path.exists() {
            // Calculate directories: backend_path is ".../backend/src/index.js"
            // parent() -> src/, parent().parent() -> backend/
            let backend_folder = backend_path
                .parent()
                .and_then(|p| p.parent())
                .expect("Failed to resolve backend folder");

            backend_dir = backend_folder.to_path_buf(); // Use backend directory as working dir

            // Script path relative to backend directory: "src/index.js"
            backend_script_path = backend_path
                .strip_prefix(&backend_dir)
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_else(|_| "src/index.js".to_string());

            backend_found = true;
            println!("Found backend at: {:?}", backend_path);
            println!("Backend directory: {:?}", backend_dir);
            println!("Backend script (relative): {}", backend_script_path);
            break;
        }
    }

    if !backend_found {
        eprintln!("Warning: Backend not found in any of these locations:");
        for path in &backend_paths {
            eprintln!("  - {:?} (exists: {})", path, path.exists());
        }
        eprintln!("App will try to connect to existing server.");
        eprintln!("To start backend manually: cd backend && npm start");
        return Ok(()); // Don't fail, just try to connect
    }

    // Find Node.js executable
    let node_path = find_node_executable(node_cmd);
    let node_cmd_to_use = match &node_path {
        Some(path) => {
            println!("Found Node.js at: {:?}", path);
            path.as_str()
        }
        None => {
            eprintln!(
                "Warning: Node.js not found in PATH. Trying '{}' anyway...",
                node_cmd
            );
            node_cmd
        }
    };

    // Start Node.js backend process
    println!(
        "Starting backend: {} in directory: {:?}",
        backend_script_path, backend_dir
    );
    let mut child_builder = Command::new(node_cmd_to_use);
    child_builder
        .current_dir(&backend_dir)
        .arg(&backend_script_path);

    let node_env = std::env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string());
    child_builder.env("NODE_ENV", node_env);
    child_builder.env(
        "PORT",
        std::env::var("PORT").unwrap_or_else(|_| "3001".to_string()),
    );

    // Ensure the backend has a session secret; generate a deterministic default for desktop usage
    const DEFAULT_SESSION_SECRET: &str = "desktop-session-secret-please-change-0123456789abcdef";
    let session_secret = std::env::var("SESSION_SECRET")
        .ok()
        .filter(|s| s.len() >= 32)
        .unwrap_or_else(|| DEFAULT_SESSION_SECRET.to_string());
    child_builder.env("SESSION_SECRET", session_secret);

    // Preserve FRONTEND_URL if provided, otherwise fall back to tauri scheme
    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "tauri://localhost".to_string());
    child_builder.env("FRONTEND_URL", frontend_url);

    // Capture stderr to see backend errors
    child_builder.stderr(std::process::Stdio::piped());
    child_builder.stdout(std::process::Stdio::piped());

    let child = child_builder.spawn();

    match child {
        Ok(process) => {
            // Store process handle
            if let Some(state) = app.try_state::<AppState>() {
                *state.backend_process.lock().unwrap() = Some(process);
            }

            // Wait for backend to be ready
            println!("Waiting for backend to start...");
            for i in 0..30 {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                if reqwest::get("http://localhost:3001/health").await.is_ok() {
                    println!("Backend is ready!");
                    return Ok(());
                }
                if i % 5 == 0 {
                    println!("Still waiting for backend... ({}/30)", i);
                }
            }

            eprintln!("Warning: Backend did not start within 30 seconds");
            Ok(())
        }
        Err(e) => {
            eprintln!(
                "Failed to start backend: {}. App will try to connect to existing server.",
                e
            );
            Ok(()) // Don't fail, user might have backend running separately
        }
    }
}
