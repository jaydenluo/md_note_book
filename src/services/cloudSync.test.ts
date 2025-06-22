import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudSyncService } from '@services/cloudSync'
import { mockWebDAV, generateTestCategory, generateTestNote } from '@test/utils'

vi.mock('webdav', () => mockWebDAV())

describe('CloudSyncService', () => {
  let service: CloudSyncService

  const testConfig = {
    url: 'https://test.com',
    username: 'test',
    password: 'test'
  }

  const testData = {
    categories: [
      generateTestCategory({ id: '1', name: 'Category 1' }),
      generateTestCategory({ id: '2', name: 'Category 2' })
    ],
    notes: [
      generateTestNote({ id: '1', title: 'Note 1' }),
      generateTestNote({ id: '2', title: 'Note 2' })
    ]
  }

  beforeEach(() => {
    localStorage.clear()
    service = new CloudSyncService()
  })

  it('initializes with saved config', () => {
    localStorage.setItem('webdav_config', JSON.stringify(testConfig))
    service = new CloudSyncService()
    expect(service).toBeDefined()
  })

  it('connects successfully', async () => {
    service.initClient(testConfig)
    const isConnected = await service.testConnection()
    expect(isConnected).toBe(true)
  })

  it('uploads data successfully', async () => {
    service.initClient(testConfig)
    await expect(service.uploadData(
      testData.categories,
      testData.notes
    )).resolves.not.toThrow()
  })

  it('downloads data successfully', async () => {
    service.initClient(testConfig)
    await service.uploadData(testData.categories, testData.notes)
    const data = await service.downloadData()

    expect(data).toBeDefined()
    expect(data?.categories).toHaveLength(2)
    expect(data?.notes).toHaveLength(2)
  })

  it('syncs data correctly', async () => {
    service.initClient(testConfig)
    const result = await service.sync(testData)

    expect(result.categories).toHaveLength(2)
    expect(result.notes).toHaveLength(2)
  })

  it('handles connection errors', async () => {
    service.initClient({
      ...testConfig,
      url: 'invalid-url'
    })

    await expect(service.testConnection()).resolves.toBe(false)
  })

  it('disconnects properly', () => {
    service.initClient(testConfig)
    service.disconnect()
    expect(localStorage.getItem('webdav_config')).toBeNull()
  })
}) 