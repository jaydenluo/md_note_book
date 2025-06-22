import { createClient } from 'webdav'
import type { Note } from '@stores/noteStore'
import type { Category } from '@stores/categoryStore'

interface SyncData {
  categories: Category[]
  notes: Note[]
  lastSyncTime: number
}

export class CloudSyncService {
  private client: any = null
  private syncPath = '/notebook/'
  private syncFileName = 'data.json'
  private webdavUrl: string = ''
  private username: string = ''
  private password: string = ''

  constructor() {
    const savedConfig = localStorage.getItem('webdav_config')
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      this.initClient(config)
    }
  }

  initClient(config: { url: string; username: string; password: string }) {
    this.webdavUrl = config.url
    this.username = config.username
    this.password = config.password

    this.client = createClient(config.url, {
      username: config.username,
      password: config.password
    })
    
    localStorage.setItem('webdav_config', JSON.stringify(config))
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false

    try {
      await this.client.getDirectoryContents('/')
      return true
    } catch (error) {
      console.error('WebDAV connection test failed:', error)
      return false
    }
  }

  private async ensureSyncDirectory() {
    if (!this.client) throw new Error('WebDAV client not initialized')

    try {
      const exists = await this.client.exists(this.syncPath)
      if (!exists) {
        await this.client.createDirectory(this.syncPath)
      }
    } catch (error) {
      console.error('Failed to ensure sync directory:', error)
      throw error
    }
  }

  async uploadData(categories: Category[], notes: Note[]): Promise<void> {
    if (!this.client) throw new Error('WebDAV client not initialized')

    try {
      await this.ensureSyncDirectory()

      const data: SyncData = {
        categories,
        notes,
        lastSyncTime: Date.now()
      }

      const content = JSON.stringify(data, null, 2)
      await this.client.putFileContents(
        this.syncPath + this.syncFileName,
        content,
        { overwrite: true }
      )
    } catch (error) {
      console.error('Failed to upload data:', error)
      throw error
    }
  }

  async downloadData(): Promise<SyncData | null> {
    if (!this.client) throw new Error('WebDAV client not initialized')

    try {
      const exists = await this.client.exists(this.syncPath + this.syncFileName)
      if (!exists) {
        return null
      }

      const content = await this.client.getFileContents(
        this.syncPath + this.syncFileName,
        { format: 'text' }
      )

      return JSON.parse(content as string)
    } catch (error) {
      console.error('Failed to download data:', error)
      throw error
    }
  }

  async sync(localData: { categories: Category[]; notes: Note[] }): Promise<{
    categories: Category[]
    notes: Note[]
  }> {
    const remoteData = await this.downloadData()

    if (!remoteData) {
      await this.uploadData(localData.categories, localData.notes)
      return localData
    }

    // 简单的时间戳比较策略
    const localLastModified = Math.max(
      ...localData.notes.map(n => new Date(n.updatedAt).getTime()),
      ...localData.categories.map(c => new Date(c.updatedAt).getTime())
    )

    if (localLastModified > remoteData.lastSyncTime) {
      await this.uploadData(localData.categories, localData.notes)
      return localData
    } else {
      return {
        categories: remoteData.categories,
        notes: remoteData.notes
      }
    }
  }

  disconnect() {
    this.client = null
    localStorage.removeItem('webdav_config')
  }
} 