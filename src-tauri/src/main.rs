// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod pdf_export;
mod search;

use search::{SearchResult, TantivyManager};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
async fn init_search_index(handle: AppHandle, manager: State<'_, TantivyManager>) -> Result<(), String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let index_path = app_dir.join("search_index");
    manager.init_index(index_path)
}

#[tauri::command]
async fn search_notes(query: String, limit: usize, manager: State<'_, TantivyManager>) -> Result<Vec<SearchResult>, String> {
    manager.search(&query, limit)
}

#[tauri::command]
async fn update_note_index(id: String, title: String, content: String, manager: State<'_, TantivyManager>) -> Result<(), String> {
    manager.update_index(&id, &title, &content)
}

#[tauri::command]
async fn delete_note_index(id: String, manager: State<'_, TantivyManager>) -> Result<(), String> {
    manager.delete_index(&id)
}

#[tauri::command]
async fn export_pdf_from_html(html: String, output_path: String) -> Result<(), String> {
    pdf_export::export_pdf_from_html(&html, &output_path)
}

fn main() {
    tauri::Builder::default()
        .manage(TantivyManager::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            init_search_index,
            search_notes,
            update_note_index,
            delete_note_index,
            export_pdf_from_html
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            log::info!("Tauri application initialized successfully");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
