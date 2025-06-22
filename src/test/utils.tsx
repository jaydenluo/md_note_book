import { ReactElement } from 'react'
import { render } from '@testing-library/react'

// 自定义渲染函数，可以在这里添加 providers、context 等
export function renderWithProviders(ui: ReactElement) {
  return render(ui)
}

// 生成测试数据
export function generateTestCategory(override = {}) {
  return {
    id: 'test-category-id',
    name: 'Test Category',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...override
  }
}

export function generateTestNote(override = {}) {
  return {
    id: 'test-note-id',
    categoryId: 'test-category-id',
    title: 'Test Note',
    content: 'Test Content',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...override
  }
}

// Mock IndexedDB
export function mockIndexedDB() {
  const store: { [key: string]: any } = {}
  
  const indexedDB = {
    open: () => ({
      result: {
        transaction: () => ({
          objectStore: () => ({
            getAll: () => ({
              result: store[name] || []
            }),
            put: (data: any) => {
              store[name] = data
              return { result: undefined }
            },
            clear: () => {
              store[name] = []
              return { result: undefined }
            }
          })
        })
      },
      onupgradeneeded: () => {}
    })
  }

  global.indexedDB = indexedDB as any
}

// Mock WebDAV
export function mockWebDAV() {
  let store: { [key: string]: string } = {}

  return {
    createClient: () => ({
      exists: async (path: string) => !!store[path],
      getDirectoryContents: async () => [],
      createDirectory: async () => {},
      putFileContents: async (path: string, content: string) => {
        store[path] = content
      },
      getFileContents: async (path: string) => store[path] || null
    })
  }
}

// Mock Web Worker
export function mockWebWorker() {
  class Worker {
    onmessage: ((event: MessageEvent) => void) | null = null
    postMessage(data: any) {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }))
      }
    }
  }

  global.Worker = Worker as any
} 