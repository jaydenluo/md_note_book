/**
 * 插件类型定义
 */
type TauriPlugin = {
  [key: string]: unknown;
};

/**
 * Tauri 环境管理类
 */
class TauriEnvironment {
  private static instance: TauriEnvironment;
  private _isInitialized: boolean = false;
  private _isTauriApp: boolean = false;
  private _plugins: {
    fs?: TauriPlugin;
    dialog?: TauriPlugin;
    shell?: TauriPlugin;
    path?: TauriPlugin;
  } = {};

  private constructor() {
    // 私有构造函数，防止直接实例化
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): TauriEnvironment {
    if (!TauriEnvironment.instance) {
      TauriEnvironment.instance = new TauriEnvironment();
    }
    return TauriEnvironment.instance;
  }

  /**
   * 初始化环境
   */
  public init(): void {
    if (this._isInitialized) return;

    try {
      this._isTauriApp = typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';
      this._isInitialized = true;
      console.log('Tauri环境检查完成:', this._isTauriApp ? '是Tauri应用' : '是Web应用');
    } catch (error) {
      console.error('Tauri环境检查失败:', error);
      this._isTauriApp = false;
      this._isInitialized = true;
    }
  }

  /**
   * 获取是否是Tauri应用
   */
  public get isTauri(): boolean {
    if (!this._isInitialized) {
      this.init();
    }
    return this._isTauriApp;
  }

  /**
   * 获取插件
   */
  private async getPlugin<T>(key: keyof TauriEnvironment['_plugins'], importFn: () => Promise<T>): Promise<T | null> {
    if (!this.isTauri) return null;
    
    if (!this._plugins[key]) {
      try {
        this._plugins[key] = await importFn() as TauriPlugin;
      } catch (error) {
        console.error(`加载 ${key} 插件失败:`, error);
        return null;
      }
    }
    
    return this._plugins[key] as unknown as T;
  }

  /**
   * 打开链接
   */
  public async openLink(url: string): Promise<void> {
    if (this.isTauri) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * 获取文件系统插件
   */
  public async getFsPlugin() {
    return this.getPlugin('fs', () => import('@tauri-apps/plugin-fs'));
  }

  /**
   * 获取对话框插件
   */
  public async getDialogPlugin() {
    return this.getPlugin('dialog', () => import('@tauri-apps/plugin-dialog'));
  }

  /**
   * 获取 Shell 插件
   */
  public async getShellPlugin() {
    return this.getPlugin('shell', () => import('@tauri-apps/plugin-shell'));
  }

  /**
   * 获取路径工具
   */
  public async getPath() {
    return this.getPlugin('path', () => import('@tauri-apps/api/path'));
  }
}

// 创建环境实例
const tauriEnv = TauriEnvironment.getInstance();

// 导出便捷方法
export const isTauriApp = () => tauriEnv.isTauri;
export const openLink = (url: string) => tauriEnv.openLink(url);
export const getFsPlugin = () => tauriEnv.getFsPlugin();
export const getDialogPlugin = () => tauriEnv.getDialogPlugin();
export const getShellPlugin = () => tauriEnv.getShellPlugin();
export const getPath = () => tauriEnv.getPath();

// 导出环境实例（如果需要直接访问）
export const tauriEnvironment = tauriEnv; 



// // 1. 基本环境检查
// if (isTauriApp()) {
//   console.log('运行在 Tauri 环境中');
// }

// // 2. 使用插件
// const fs = await getFsPlugin();
// if (fs) {
//   // 使用文件系统功能
// }

// // 3. 打开链接
// await openLink('https://example.com');

// // 4. 直接使用环境实例（如果需要）
// const env = tauriEnvironment;
// if (env.isTauri) {
//   // 做一些只在 Tauri 环境中的操作
// }