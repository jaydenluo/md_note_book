import type { FC } from 'react'
import { useState } from 'react'
import { storage } from '@services/storage'

interface ImportExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const ImportExportDialog: FC<ImportExportDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError(null)

    try {
      const text = await file.text()
      await storage.importData(text)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      const data = await storage.exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notebook_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">导入/导出数据</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block mb-2">导入数据</label>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="w-full"
            />
          </div>

          <div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isExporting ? '导出中...' : '导出数据'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
} 