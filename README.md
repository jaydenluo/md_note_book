# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## 开发和生产命令

### 开发环境
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

### 生产环境
```bash
# 构建生产版本
pnpm run build

# 预览生产构建
pnpm run preview
```


项目配置分析
已完成的配置：
安装了 Tauri CLI: @tauri-apps/cli
初始化了 Tauri 配置文件 src-tauri/tauri.conf.json
修改了前端构建路径为 ../dist（与 Vite 默认输出一致）
修改了开发服务器地址为 http://localhost:5173（Vite 默认端口）
自定义了应用标识符 com.notebook.app
添加了打包相关命令到 package.json
打包命令：
通用打包：pnpm tauri:build
Windows 专用打包：pnpm tauri:build:windows
macOS 专用打包：pnpm tauri:build:macos
打包前的准备：
确保 Rust 环境已安装（Tauri 依赖 Rust）
Windows 需要安装 Visual Studio 构建工具
macOS 需要安装 Xcode Command Line Tools
打包流程：
运行打包命令会先执行前端构建（pnpm build）
然后 Tauri 会将前端资源和 Rust 后端打包成原生应用
输出的安装包将位于 src-tauri/target/release/bundle/ 目录
自定义选项：
可以在 tauri.conf.json 中修改窗口大小、标题等
可以添加自定义图标（需要替换 src-tauri/icons/ 中的图标文件）
可以配置权限、系统托盘、更新机制等高级功能
要开始打包，只需运行相应的命令即可。如果您需要更多自定义配置，可以进一步修改 tauri.conf.json 文件。