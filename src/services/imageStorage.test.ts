// 图片存储服务测试
import { uploadAndSaveImage, deleteImageFile, getImageUrl, checkImageExists } from './imageStorage'

// 模拟File对象
function createMockFile(name: string, content: string, type: string = 'image/jpeg'): File {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

describe('ImageStorage', () => {
  test('should create image storage service', () => {
    expect(uploadAndSaveImage).toBeDefined()
    expect(deleteImageFile).toBeDefined()
    expect(getImageUrl).toBeDefined()
    expect(checkImageExists).toBeDefined()
  })

  test('should handle mock file creation', () => {
    const mockFile = createMockFile('test.jpg', 'fake image data')
    expect(mockFile.name).toBe('test.jpg')
    expect(mockFile.type).toBe('image/jpeg')
  })
}) 