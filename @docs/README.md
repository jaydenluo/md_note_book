# 笔记本应用项目文档

## 项目概述

本项目是一个基于 React + Tauri 的笔记本应用，支持两种运行模式：
- **Tauri 桌面应用模式**：数据保存在 SQLite 数据库中
- **网页模式**：数据保存在 localStorage 中

应用特点：
- 富文本编辑器支持 Markdown、代码高亮、数学公式等
- 文件管理系统支持分类组织笔记
- 支持标签、搜索等功能
- 美观现代的 UI 设计

## 技术栈

- **前端框架**：React 18
- **UI 组件**：Shadcn UI + Tailwind CSS
- **编辑器**：TipTap/Remirror（富文本编辑）
- **状态管理**：Zustand
- **桌面应用**：Tauri
- **测试**：Vitest

## 文档目录

本文档目录包含以下内容：

1. [开发任务文档](./开发任务文档.md) - 项目总体任务规划和进度
2. [任务追踪模板](./任务追踪模板.md) - 用于创建新任务的模板
3. [周报模板](./周报模板.md) - 团队周报模板
4. [任务示例](./任务示例-富文本编辑器增强.md) - 任务追踪示例

## 任务管理系统使用说明

### 创建新任务

1. 复制 `任务追踪模板.md` 文件
2. 重命名为 `任务-[任务名称].md`
3. 按照模板填写任务详情
4. 在 `开发任务文档.md` 中更新任务状态

### 任务状态更新

1. 定期更新任务文档中的进度
2. 在任务文档的"进度记录"部分记录重要进展
3. 更新 `开发任务文档.md` 中的任务状态

### 周报提交

1. 复制 `周报模板.md` 文件
2. 重命名为 `周报-YYYY-MM-DD.md`（以周五日期命名）
3. 填写本周工作进展、问题和下周计划
4. 在每周五下午5点前提交

## 开发流程

1. **需求分析**：明确功能需求，创建任务文档
2. **任务分配**：分配任务给团队成员
3. **开发实现**：按照任务文档进行开发
4. **代码审查**：完成开发后进行代码审查
5. **测试验证**：进行功能测试和性能测试
6. **部署发布**：部署到测试/生产环境

## 分支管理

- **main**：主分支，保持稳定
- **develop**：开发分支
- **feature/***：功能分支
- **bugfix/***：修复分支
- **release/***：发布分支

## 提交规范

- **feat**: 新功能
- **fix**: 修复 bug
- **docs**: 文档更新
- **style**: 代码风格修改
- **refactor**: 重构
- **perf**: 性能优化
- **test**: 测试
- **build**: 构建系统或外部依赖更改
- **ci**: CI 配置更改

## 联系方式

如有问题，请联系项目负责人。

---

*注：本文档将持续更新，请团队成员定期查看最新信息。* 






行号当前是通过在`CodeBlockView.tsx`文件中的`generateLineNumbers`函数实现的。这个函数的核心逻辑是：

1. 将代码文本按换行符分割成行
2. 对每一行生成一个带有编号的div元素
3. 这些编号元素被放置在代码块旁边的一个专门区域

具体实现如下：

```tsx
// 生成行号
const generateLineNumbers = () => {
  const lines = node.textContent.split('\n');
  return lines.map((_, index) => (
    <div key={index} className="line-number">
      {index + 1}
    </div>
  ));
};
```

这些行号显示在`.code-block-line-numbers`容器中：

```tsx
<div className="code-block-body">
  <div className="code-block-line-numbers">
    {generateLineNumbers()}
  </div>
  <pre
    ref={codeRef}
    className="code-block-content"
    style={{ maxHeight: height ? `${height}px` : 'auto' }}
    contentEditable="true"
    onBlur={handleCodeChange}
    suppressContentEditableWarning={true}
  >
    {node.textContent}
  </pre>
  
  <button 
    className="code-block-copy-button"
    onClick={handleCopy}
    title="复制代码"
  >
    <CopyIcon size={16} />
  </button>
</div>
```

对应的样式定义在`src/styles/codeBlock.css`中：

```css
/* 行号显示样式 */
.code-block-line-numbers {
  display: flex;
  flex-direction: column;
  padding: 1rem 0.5rem;
  @apply bg-gray-100 dark:bg-gray-800;
  @apply border-r border-gray-200 dark:border-gray-700;
  user-select: none;
  text-align: right;
  @apply text-gray-400 dark:text-gray-500;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  min-width: 3rem;
}

.line-number {
  padding: 0 0.5rem;
  @apply text-gray-400 dark:text-gray-500;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}
```

高亮和编辑问题可能是因为使用原生contentEditable导致编辑时行号不能实时更新。需要添加监听器来捕获实时内容变化。