// 图片上传工具函数
import { compress } from 'browser-image-compression'

// 图片上传配置接口
interface ImageUploadOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  maxIteration?: number
}

// 默认配置
const defaultOptions: ImageUploadOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  maxIteration: 10,
}

/**
 * 处理图片文件上传
 * @param file 图片文件
 * @param options 压缩选项
 * @returns Promise<string> 返回图片的 base64 字符串
 */
export async function handleImageUpload(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  try {
    // 合并配置
    const compressOptions = { ...defaultOptions, ...options }

    // 压缩图片
    const compressedFile = await compress(file, compressOptions)

    // 转换为 base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(compressedFile)
    })
  } catch (error) {
    console.error('图片处理失败:', error)
    throw error
  }
}

/**
 * 从剪贴板数据中提取图片
 * @param items 剪贴板数据项
 * @returns Promise<File[]> 返回图片文件数组
 */
export function getImagesFromClipboard(items: DataTransferItemList): Promise<File[]> {
  return new Promise((resolve) => {
    const images: File[] = []
    
    Array.from(items).forEach((item) => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) images.push(file)
      }
    })
    
    resolve(images)
  })
}

/**
 * 检查图片URL是否有效
 * @param url 图片URL
 * @returns Promise<boolean>
 */
export function checkImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

/**
 * 生成图片缩略图
 * @param file 图片文件
 * @param maxWidth 最大宽度
 * @returns Promise<string> 返回缩略图的 base64 字符串
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 100
): Promise<string> {
  try {
    const options: ImageUploadOptions = {
      maxWidthOrHeight: maxWidth,
      maxSizeMB: 0.1,
      useWebWorker: true,
    }
    
    return await handleImageUpload(file, options)
  } catch (error) {
    console.error('生成缩略图失败:', error)
    throw error
  }
}

/**
 * 转换图片为WebP格式
 * @param file 图片文件
 * @returns Promise<Blob> 返回WebP格式的图片数据
 */
export function convertToWebP(file: File): Promise<Blob> {
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
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('转换WebP失败'))
        },
        'image/webp',
        0.8
      )
    }
    
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
} 