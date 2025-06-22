// 为@别名路径添加类型支持
declare module '@test/utils' {
  export function mockIndexedDB(): void;
  export function mockWebDAV(): any;
  export function generateTestCategory(props?: any): any;
  export function generateTestNote(props?: any): any;
  export function renderWithProviders(ui: React.ReactElement): any;
}

declare module '@utils/date' {
  export function formatDate(date: Date): string;
}

declare module '@utils/markdown' {
  export const md: any;
} 