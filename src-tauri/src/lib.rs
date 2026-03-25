mod search;
mod pdf_export;

use search::{TantivyManager, SearchResult};
use tauri::{State, Manager, AppHandle};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TantivyManager::new())
        .plugin(tauri_plugin_fs::init())       // 初始化文件系统插件
        .plugin(tauri_plugin_opener::init())  // 初始化 opener 插件
        .invoke_handler(tauri::generate_handler![
            init_search_index,
            search_notes,
            update_note_index,
            delete_note_index,
            export_pdf_from_html
        ])
        .setup(|app| {
            // 在开发模式下启用日志
            #[cfg(debug_assertions)]
            {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // 初始化完成后打印日志
            log::info!("Tauri application initialized successfully");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
