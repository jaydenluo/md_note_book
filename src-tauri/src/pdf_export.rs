use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

/**
 * 将 HTML 写入临时文件并通过 Edge/Chrome headless 打印为 PDF
 */
pub fn export_pdf_from_html(html: &str, output_path: &str) -> Result<(), String> {
    let output_path = PathBuf::from(output_path);
    if output_path.extension().and_then(|s| s.to_str()) != Some("pdf") {
        return Err("输出路径必须是 .pdf 文件".to_string());
    }

    let temp_html_path = build_temp_html_path(&output_path)?;
    fs::write(&temp_html_path, html).map_err(|e| format!("写入临时 HTML 失败: {e}"))?;

    let file_url = to_file_url(&temp_html_path)?;
    let output_str = output_path
        .to_str()
        .ok_or_else(|| "输出路径无效".to_string())?
        .to_string();

    let candidates = [
        "msedge",
        "msedge.exe",
        "chrome",
        "chrome.exe",
        "chromium",
        "chromium.exe",
    ];

    let mut last_err: Option<String> = None;
    for bin in candidates {
        match Command::new(bin)
            .arg("--headless")
            .arg("--disable-gpu")
            .arg("--no-first-run")
            .arg("--no-default-browser-check")
            .arg(format!("--print-to-pdf={output_str}"))
            .arg("--print-to-pdf-no-header")
            .arg(file_url.clone())
            .status()
        {
            Ok(status) => {
                if status.success() {
                    let _ = fs::remove_file(&temp_html_path);
                    return Ok(());
                }
                last_err = Some(format!("浏览器进程退出码异常: {status}"));
            }
            Err(e) => {
                last_err = Some(format!("无法启动 {bin}: {e}"));
            }
        }
    }

    let _ = fs::remove_file(&temp_html_path);
    Err(last_err.unwrap_or_else(|| "生成 PDF 失败".to_string()))
}

/**
 * 生成临时 HTML 文件路径
 */
fn build_temp_html_path(output_path: &Path) -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir();
    let stem = output_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("export")
        .to_string();

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    Ok(temp_dir.join(format!("{stem}-{ts}.html")))
}

/**
 * 将本地路径转换为 file:// URL
 */
fn to_file_url(path: &Path) -> Result<String, String> {
    let abs = fs::canonicalize(path).map_err(|e| format!("规范化路径失败: {e}"))?;
    let s = abs
        .to_str()
        .ok_or_else(|| "路径转换失败".to_string())?
        .replace('\\', "/");

    if s.starts_with("//") {
        return Ok(format!("file:{s}"));
    }

    Ok(format!("file:///{s}"))
}
