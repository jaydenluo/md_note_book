/**
 * 防抖函数
 * @param fn 需要防抖的函数
 * @param delay 延迟时间(毫秒)
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: number | null = null

  return function(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise(resolve => {
      if (timer) clearTimeout(timer)
      
      timer = setTimeout(() => {
        const result = fn(...args)
        resolve(result)
      }, delay) as unknown as number
    })
  }
} 