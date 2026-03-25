import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { CloudSyncService } from '@services/cloudSync'
import { Cloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface CloudSyncDialogProps {
  isOpen: boolean
  onClose: () => void
  onSync: (service: CloudSyncService) => Promise<void>
}

export const CloudSyncDialog: FC<CloudSyncDialogProps> = ({
  isOpen,
  onClose,
  onSync
}) => {
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 加载保存的配置
  useEffect(() => {
    if (isOpen) {
      const savedConfig = localStorage.getItem('webdav_config')
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig)
          setUrl(config.url || '')
          setUsername(config.username || '')
          setPassword(config.password || '')
        } catch (e) {
          console.error('Failed to parse saved webdav config', e)
        }
      }
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const service = new CloudSyncService()
      service.initClient({ url, username, password })

      const isConnected = await service.testConnection()
      if (!isConnected) {
        throw new Error('无法连接到服务器，请检查地址、用户名和密码。')
      }

      await onSync(service)
      setSuccess(true)
      // 1.5秒后自动关闭
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            <Cloud className="w-6 h-6 text-blue-500" />
            配置云同步 (WebDAV)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                服务器地址
              </label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://dav.jianguoyun.com/dav/"
                required
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
              <p className="text-xs text-gray-500">例如坚果云: https://dav.jianguoyun.com/dav/</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                用户名
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="您的 WebDAV 用户名"
                required
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                密码 / 应用授权码
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="您的 WebDAV 密码"
                required
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>同步成功！正在关闭...</span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading || success}
              className="bg-blue-500 hover:bg-blue-600 text-white min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  同步中...
                </>
              ) : success ? (
                '已完成'
              ) : (
                '连接并同步'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 