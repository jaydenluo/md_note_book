// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result as SqliteResult};
use std::sync::{Arc, Mutex};
use std::fs;
use std::path::Path;
use tauri::Manager;

// 应用状态，包含数据库连接
pub struct AppState {
    conn: Arc<Mutex<Connection>>,
}

// 初始化数据库，创建必要的表
fn init_database(conn: &Connection) -> SqliteResult<()> {
    // 创建笔记表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    Ok(())
}

fn main() {
    // 确保数据目录存在
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .expect("无法获取应用数据目录");
    let db_dir = app_data_dir.join("db");
    fs::create_dir_all(&db_dir).expect("无法创建数据库目录");
    
    // 打开或创建SQLite数据库
    let db_path = db_dir.join("notes.db");
    let conn = Connection::open(&db_path).expect("无法打开数据库");
    
    // 初始化数据库表
    init_database(&conn).expect("初始化数据库失败");
    
    // 创建应用状态
    let app_state = AppState {
        conn: Arc::new(Mutex::new(conn)),
    };
    
    // 构建Tauri应用
    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("运行应用失败");
}
