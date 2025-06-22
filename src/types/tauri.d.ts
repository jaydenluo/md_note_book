declare module '@tauri-apps/plugin-sql' {
  export default class Database {
    static load(url: string): Promise<Database>;
    execute(query: string, bindValues?: any[]): Promise<any>;
    select<T = any>(query: string, bindValues?: any[]): Promise<T[]>;
  }
}

declare module '@tauri-apps/api' {
  export namespace path {
    function appDataDir(): Promise<string>;
    function join(...paths: string[]): Promise<string>;
  }
} 