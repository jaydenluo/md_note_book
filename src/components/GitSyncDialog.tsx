import { useState, useEffect, useMemo } from 'react'
import type { FC } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { GitSyncService } from '@/services/gitSync'
import { getDataRootDir } from '@/services/fileDataStorage'

// 自定义图标组件以确保 100% 兼容性
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
);

const AlertTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

interface GitSyncDialogProps {
  isOpen: boolean
  onClose: () => void
}

type DialogMode = 'no_config' | 'need_init' | 'ready'

type PersistedGitSyncConfig = {
  repoUrl: string
  branch: string
  autoSync: boolean
}

export const GitSyncDialog: FC<GitSyncDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('master')
  const [autoSync, setAutoSync] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [mode, setMode] = useState<DialogMode>('no_config')
  const [currentBranch, setCurrentBranch] = useState<string | null>(null)
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)
  const [isRepo, setIsRepo] = useState<boolean | null>(null)
  const [hasChanges, setHasChanges] = useState<boolean>(false)

  const canEditConfig = useMemo(() => mode !== 'ready', [mode])

  const saveConfig = (cfg: PersistedGitSyncConfig) => {
    localStorage.setItem('git_sync_config', JSON.stringify(cfg))
  }

  const clearConfig = () => {
    localStorage.removeItem('git_sync_config')
  }

  const detectRepoState = async (cfg: PersistedGitSyncConfig | null) => {
    // 获取实际的数据根目录，确保 Git 在正确的路径下执行
    const rootDir = await getDataRootDir()
    const gitService = new GitSyncService(rootDir)

    const repoRes = await gitService.isGitRepo()
    if (!repoRes.success) {
      throw new Error(repoRes.error || '检测 Git 仓库状态失败')
    }

    setIsRepo(repoRes.isRepo)
    const detectedRemote = repoRes.isRepo ? await gitService.getRemoteUrl('origin') : null
    setRemoteUrl(detectedRemote)
    const detectedBranch = repoRes.isRepo ? await gitService.getCurrentBranch() : null
    setCurrentBranch(detectedBranch)
    const detectedHasChanges = repoRes.isRepo ? await gitService.hasChanges() : false
    setHasChanges(detectedHasChanges)

    if (!cfg?.repoUrl) {
      setMode('no_config')
      return
    }

    // 有配置但本地不是仓库，或未设置 origin => 需要初始化
    if (!repoRes.isRepo || !detectedRemote) {
      setMode('need_init')
      return
    }

    // 已是仓库且有 origin，认为 ready（remote 不一致时交给用户在配置中修正）
    setMode('ready')
  }

  // 加载保存的配置
  useEffect(() => {
    if (isOpen) {
      const savedConfig = localStorage.getItem('git_sync_config')
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig) as Partial<PersistedGitSyncConfig>
          setRepoUrl(parsed.repoUrl || '')
          setBranch(parsed.branch || 'master')
          setAutoSync(parsed.autoSync ?? true)
        } catch (e) {
          console.error('Failed to parse git sync config', e)
        }
      }
      setError(null)
      setSuccess(false)

      ;(async () => {
        try {
          let cfg: PersistedGitSyncConfig | null = null
          const raw = localStorage.getItem('git_sync_config')
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as Partial<PersistedGitSyncConfig>
              if (parsed.repoUrl) {
                cfg = {
                  repoUrl: parsed.repoUrl,
                  branch: parsed.branch || 'master',
                  autoSync: parsed.autoSync ?? true,
                }
              }
            } catch {
              // ignore
            }
          }
          await detectRepoState(cfg)
        } catch (err) {
          setError((err as Error).message)
          setMode('no_config')
        }
      })()
    }
  }, [isOpen])

  const runSync = async () => {
    setError(null)
    setSuccess(false)
    setIsLoading(true)
    try {
      const rootDir = await getDataRootDir()
      const gitService = new GitSyncService(rootDir)
      console.log('正在执行 Git 同步...')
      await gitService.pull(branch)
      const pushOk = await gitService.commitAndPush('Auto-sync from NoteBook', branch)
      if (!pushOk) {
        throw new Error('推送失败，请检查网络/权限/分支设置')
      }
      setSuccess(true)
      await detectRepoState({ repoUrl, branch, autoSync })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    try {
      if (!repoUrl.trim()) {
        throw new Error('请填写仓库地址')
      }
      saveConfig({ repoUrl: repoUrl.trim(), branch: branch.trim() || 'master', autoSync })
      await detectRepoState({ repoUrl: repoUrl.trim(), branch: branch.trim() || 'master', autoSync })
      setSuccess(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleInitRepo = async () => {
    setError(null)
    setSuccess(false)
    setIsLoading(true)
    try {
      const rootDir = await getDataRootDir()
      const gitService = new GitSyncService(rootDir)
      const initRes = await gitService.initRepo(repoUrl, branch)
      if (!initRes.success) {
        throw new Error(initRes.error || '初始化 Git 仓库失败，请检查远程地址。')
      }
      saveConfig({ repoUrl: repoUrl.trim(), branch: branch.trim() || 'master', autoSync })
      setSuccess(true)
      await detectRepoState({ repoUrl, branch, autoSync })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearConfig = async () => {
    clearConfig()
    setRepoUrl('')
    setBranch('master')
    setAutoSync(true)
    setError(null)
    setSuccess(false)
    setMode('no_config')
    setRemoteUrl(null)
    setCurrentBranch(null)
    setIsRepo(null)
    setHasChanges(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            <div className="w-6 h-6 flex items-center justify-center">
              <GithubIcon />
            </div>
            配置 Git 同步
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSaveConfig} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                仓库地址 (HTTPS/SSH)
              </label>
              <Input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="git@github.com:username/repo.git"
                required
                disabled={!canEditConfig}
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
              <p className="text-xs text-gray-500">提示：如果是私有仓库，建议使用 SSH 地址或配置好凭据管理器。</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                分支
              </label>
              <Input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="master"
                required
                disabled={!canEditConfig}
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-3 py-2">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">自动同步</div>
                <div className="text-xs text-gray-500">方案A：启动同步 + 保存后延迟同步（不启用定时同步）</div>
              </div>
              <button
                type="button"
                onClick={() => setAutoSync(v => !v)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSync ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                aria-pressed={autoSync}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black transition-transform ${autoSync ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {mode === 'ready' && (
              <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
                <div className="text-sm text-gray-700 dark:text-gray-300">当前状态</div>
                <div className="text-xs text-gray-500">
                  <div>本地仓库：{isRepo ? '是' : '否'}</div>
                  <div>远程仓库：{remoteUrl || '-'}</div>
                  <div>当前分支：{currentBranch || '-'}</div>
                  <div>未提交改动：{hasChanges ? '有' : '无'}</div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <AlertTriangleIcon />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <CheckIcon />
                <span>Git 同步完成！</span>
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

            {mode === 'no_config' && (
              <Button
                type="submit"
                disabled={isLoading || success}
                className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : success ? (
                  '已保存'
                ) : (
                  '保存配置'
                )}
              </Button>
            )}

            {mode === 'need_init' && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearConfig}
                  disabled={isLoading}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  清除配置
                </Button>
                <Button
                  type="button"
                  disabled={isLoading || success}
                  onClick={handleInitRepo}
                  className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      初始化中...
                    </>
                  ) : success ? (
                    '已完成'
                  ) : (
                    '初始化仓库'
                  )}
                </Button>
              </>
            )}

            {mode === 'ready' && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearConfig}
                  disabled={isLoading}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  断开
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={runSync}
                  className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      同步中...
                    </>
                  ) : (
                    '立即同步'
                  )}
                </Button>
              </>
            )}
            <Button
              type="button"
              onClick={() => setMode('no_config')}
              disabled={isLoading || mode === 'no_config'}
              className="min-w-[120px]"
            >
              修改配置
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
