import { useState } from 'react'
import type { FC } from 'react'
import { CloudSyncService } from '@services/cloudSync'

// 自定义CloudSync图标
const CloudSyncIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 mr-2"
  >
    <path d="M12 22v-5" />
    <path d="M9 18h6" />
    <path d="M18 18a4 4 0 0 0 0-8h-1a5 5 0 0 0-9-3" />
    <path d="M6 10a4 4 0 1 0 0 8h1" />
    <path d="m13 8-3 3-3-3" />
  </svg>
);

// 自定义X图标
const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// 自定义Loader2图标
const Loader2Icon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className || "h-5 w-5 animate-spin mr-2"}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

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

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const service = new CloudSyncService()
      service.initClient({ url, username, password })

      const isConnected = await service.testConnection()
      if (!isConnected) {
        throw new Error('连接测试失败')
      }

      await onSync(service)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CloudSyncIcon />
            <h2 className="text-lg font-medium">配置云同步</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                WebDAV 服务器地址
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://dav.jianguoyun.com/dav/"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2Icon />
                  连接中...
                </div>
              ) : (
                '连接并同步'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 