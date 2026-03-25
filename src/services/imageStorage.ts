// 图片存储服务 - 实现图片文件化存储
import imageCompression from 'browser-image-compression'
import { storage } from './storage'
import { tauriEnvironment } from '../utils/tauri'

// 图片存储配置接口
interface ImageStorageOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  maxIteration?: number
  format?: 'webp' | 'jpeg' | 'png' | 'original'
  quality?: number
}

// 默认配置
const defaultOptions: ImageStorageOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  maxIteration: 10,
  format: 'webp',
  quality: 0.8,
}

// 图片信息接口
interface ImageInfo {
  id: string
  filename: string
  originalName: string
  path: string
  size: number
  width: number
  height: number
  format: string
  createdAt: string
}

/**
 * 生成唯一的图片ID
 */
function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 获取图片存储目录
 */
async function getImageStorageDir(): Promise<string> {
  if (!tauriEnvironment.isTauri) {
    throw new Error('图片文件存储仅在Tauri环境中支持')
  }

  try {
    // 从配置中获取数据路径
    const { dataPath } = await storage.getConfig()
    
    if (dataPath && dataPath.trim() !== '') {
      // 使用配置的数据路径
      const { join } = await import('@tauri-apps/api/path')
      const imagesDir = await join(dataPath, 'images')
      
      // 确保目录存在
      const fs = await import('@tauri-apps/plugin-fs')
      await fs.default.mkdir(imagesDir, { recursive: true })
      
      return imagesDir
    } else {
      // 使用系统默认路径
      const { join, appDataDir } = await import('@tauri-apps/api/path')
      const fs = await import('@tauri-apps/plugin-fs')
      
      const appDir = await appDataDir()
      const notebookDir = await join(appDir, 'notebook')
      const imagesDir = await join(notebookDir, 'images')
      
      await fs.default.mkdir(imagesDir, { recursive: true })
      return imagesDir
    }
  } catch (error) {
    console.error('获取图片存储目录失败:', error)
    throw error
  }
}

/**
 * 压缩和转换图片
 */
async function processImage(file: File, options: ImageStorageOptions = {}): Promise<Blob> {
  const compressOptions = { ...defaultOptions, ...options }
  
  try {
    // 压缩图片
    const compressedFile = await imageCompression(file, {
      maxSizeMB: compressOptions.maxSizeMB,
      maxWidthOrHeight: compressOptions.maxWidthOrHeight,
      useWebWorker: compressOptions.useWebWorker,
      maxIteration: compressOptions.maxIteration,
    })

    // 如果指定了格式转换
    if (compressOptions.format && compressOptions.format !== 'original') {
      return await convertImageFormat(compressedFile, compressOptions.format, compressOptions.quality)
    }

    return compressedFile
  } catch (error) {
    console.error('图片处理失败:', error)
    throw error
  }
}

/**
 * 转换图片格式
 */
async function convertImageFormat(file: File, format: string, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'))
        return
      }
      
      ctx.drawImage(img, 0, 0)
      
      const mimeType = format === 'webp' ? 'image/webp' : 
                      format === 'jpeg' ? 'image/jpeg' : 
                      format === 'png' ? 'image/png' : 'image/png'
      
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error(`转换${format}格式失败`))
        },
        mimeType,
        quality
      )
    }
    
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 保存图片文件
 */
async function saveImageFile(blob: Blob, filename: string): Promise<string> {
  if (!tauriEnvironment.isTauri) {
    throw new Error('图片文件存储仅在Tauri环境中支持')
  }

  try {
    const imagesDir = await getImageStorageDir()
    const { join } = await import('@tauri-apps/api/path')
    const { writeBinaryFile } = await import('@tauri-apps/plugin-fs')
    
    const imagePath = await join(imagesDir, filename)
    
    // 将Blob转换为Uint8Array
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // 写入文件
    await writeBinaryFile(imagePath, uint8Array)
    
    return imagePath
  } catch (error) {
    console.error('保存图片文件失败:', error)
    throw error
  }
}

/**
 * 获取图片信息
 */
async function getImageInfo(file: File, blob: Blob): Promise<Partial<ImageInfo>> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        size: blob.size,
        width: img.width,
        height: img.height,
        format: blob.type,
      })
    }
    img.onerror = () => {
      resolve({
        size: blob.size,
        width: 0,
        height: 0,
        format: blob.type,
      })
    }
    img.src = URL.createObjectURL(blob)
  })
}

/**
 * 上传并保存图片
 * @param file 图片文件
 * @param options 处理选项
 * @returns Promise<ImageInfo> 返回图片信息
 */
export async function uploadAndSaveImage(
  file: File, 
  options: ImageStorageOptions = {}
): Promise<ImageInfo> {
  try {
    // 生成图片ID和文件名
    const imageId = generateImageId()
    const fileExtension = options.format === 'webp' ? 'webp' : 
                         options.format === 'jpeg' ? 'jpg' : 
                         options.format === 'png' ? 'png' : 
                         file.name.split('.').pop() || 'jpg'
    const filename = `${imageId}.${fileExtension}`
    
    // 处理图片
    const processedBlob = await processImage(file, options)
    
    // 保存图片文件
    const imagePath = await saveImageFile(processedBlob, filename)
    
    // 获取图片信息
    const imageInfo = await getImageInfo(file, processedBlob)
    
    // 构建完整的图片信息
    const fullImageInfo: ImageInfo = {
      id: imageId,
      filename,
      originalName: file.name,
      path: imagePath,
      size: imageInfo.size || 0,
      width: imageInfo.width || 0,
      height: imageInfo.height || 0,
      format: imageInfo.format || 'image/jpeg',
      createdAt: new Date().toISOString(),
    }
    
    console.log('图片保存成功:', fullImageInfo)
    return fullImageInfo
    
  } catch (error) {
    console.error('图片上传保存失败:', error)
    throw error
  }
}

/**
 * 删除图片文件
 * @param imagePath 图片文件路径
 */
export async function deleteImageFile(imagePath: string): Promise<void> {
  if (!tauriEnvironment.isTauri) {
    console.warn('图片文件删除仅在Tauri环境中支持')
    return
  }

  try {
    const { removeFile } = await import('@tauri-apps/plugin-fs')
    await removeFile(imagePath)
    console.log('图片文件删除成功:', imagePath)
  } catch (error) {
    console.error('删除图片文件失败:', error)
    throw error
  }
}

/**
 * 获取图片文件的完整URL
 * @param imagePath 图片文件路径
 * @returns Promise<string> 返回图片的完整URL
 */
export async function getImageUrl(imagePath: string): Promise<string> {
  if (!tauriEnvironment.isTauri) {
    // 在浏览器环境中，返回原始路径（可能是base64）
    return imagePath
  }

  try {
    // 在Tauri环境中，使用file://协议
    return `file://${imagePath}`
  } catch (error) {
    console.error('获取图片URL失败:', error)
    return imagePath
  }
}

/**
 * 检查图片文件是否存在
 * @param imagePath 图片文件路径
 * @returns Promise<boolean>
 */
export async function checkImageExists(imagePath: string): Promise<boolean> {
  if (!tauriEnvironment.isTauri) {
    return true // 在浏览器环境中假设存在
  }

  try {
    const { exists } = await import('@tauri-apps/plugin-fs')
    return await exists(imagePath)
  } catch (error) {
    console.error('检查图片文件存在失败:', error)
    return false
  }
}

/**
 * 清理未使用的图片文件
 * @param usedImagePaths 正在使用的图片路径数组
 */
export async function cleanupUnusedImages(usedImagePaths: string[]): Promise<void> {
  if (!tauriEnvironment.isTauri) {
    return
  }

  try {
    const imagesDir = await getImageStorageDir()
    const { readDir } = await import('@tauri-apps/plugin-fs')
    const { join } = await import('@tauri-apps/api/path')
    
    // 读取图片目录中的所有文件
    const entries = await readDir(imagesDir)
    const imageFiles = entries.filter(entry => !entry.children) // 只处理文件
    
    // 找出未使用的图片文件
    const unusedFiles = imageFiles.filter(entry => {
      const fullPath = join(imagesDir, entry.name)
      return !usedImagePaths.includes(fullPath)
    })
    
    // 删除未使用的图片文件
    for (const file of unusedFiles) {
      const filePath = await join(imagesDir, file.name)
      await deleteImageFile(filePath)
    }
    
    console.log(`清理了 ${unusedFiles.length} 个未使用的图片文件`)
  } catch (error) {
    console.error('清理未使用图片失败:', error)
  }
} 