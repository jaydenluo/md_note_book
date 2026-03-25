declare module '@tauri-apps/api' {
  export namespace path {
    function appDataDir(): Promise<string>;
    function join(...paths: string[]): Promise<string>;
  }
} 