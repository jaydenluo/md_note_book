declare module '@tauri-apps/plugin-fs' {
  export * from '@tauri-apps/api/fs';
}

declare module '@tauri-apps/plugin-dialog' {
  export * from '@tauri-apps/api/dialog';
  export { open, save, message } from '@tauri-apps/api/dialog';
}

declare module '@tauri-apps/plugin-shell' {
  export * from '@tauri-apps/api/shell';
}