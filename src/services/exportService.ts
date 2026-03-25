import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { renderMarkdown, sanitizeFilename } from '@/utils/markdown'
import { tauriEnvironment } from '@/utils/tauri'

/**
 * 导出服务类，处理笔记导出为不同格式
 */
export class ExportService {
  /**
   * 导出为 Markdown 文件
   */
  static async exportAsMarkdown(title: string, content: string) {
    try {
      const filePath = await save({
        title: '另存为 Markdown',
        defaultPath: `${title || '无标题'}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });

      if (filePath) {
        // 如果内容是 HTML 且我们想导出 MD，这里应该用 turndown
        // 目前先直接保存，假设系统内部已有处理或用户接受原始内容
        await writeTextFile(filePath, content);
        return true;
      }
    } catch (error) {
      console.error('导出 Markdown 失败:', error);
    }
    return false;
  }

  /**
   * 导出为 PDF 文件
   */
  static async exportAsPDF(title: string, content: string) {
    try {
      if (!tauriEnvironment.isTauri) {
        window.print();
        return true;
      }

      const safeTitle = sanitizeFilename(title || '无标题')
      const filePath = await save({
        title: '另存为 PDF',
        defaultPath: `${safeTitle}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })

      if (!filePath) return false

      const bodyHtml = renderMarkdown(content || '', false)
      const fullHtml = buildPdfHtmlDocument({ title: title || '无标题', bodyHtml })

      await invoke('export_pdf_from_html', {
        html: fullHtml,
        outputPath: filePath
      })

      return true
    } catch (error) {
      console.error('导出 PDF 失败:', error);
    }
    return false;
  }
}

/**
 * 构造用于 PDF 导出的 HTML 文档（固定亮色样式）
 */
function buildPdfHtmlDocument(params: { title: string; bodyHtml: string }): string {
  const { title, bodyHtml } = params
  const css = `
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { padding: 0; margin: 0; background: #fff; color: #111; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif; }
    .page { max-width: 860px; margin: 0 auto; padding: 36px 42px; }
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
    p { line-height: 1.75; }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
    pre { background: #0b1020; color: #e5e7eb; padding: 12px; border-radius: 8px; overflow: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    blockquote { border-left: 4px solid #e5e7eb; margin: 12px 0; padding: 6px 12px; color: #374151; background: #f9fafb; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 18px 0; }
    a { color: #2563eb; text-decoration: none; }
    @page { margin: 12mm; }
  `

  const safeTitle = escapeHtml(title)
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>${css}</style>
  </head>
  <body>
    <div class="page">
      <h1>${safeTitle}</h1>
      <div class="content">${bodyHtml}</div>
    </div>
  </body>
</html>`
}

/**
 * 转义 HTML 文本
 */
function escapeHtml(input: string): string {
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
