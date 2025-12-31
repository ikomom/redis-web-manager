# 添加前端 Loading 效果和骨架屏

## 1. 安装骨架屏组件 (shadcn/ui)
- 使用 `npx shadcn@latest add skeleton` 安装 Skeleton 组件。

## 2. 优化 `KeyList` 组件 (左侧键列表)
- **现状**: 目前仅在刷新按钮上有旋转动画。
- **改进**:
  - 在加载 keys 列表时，显示一组 `Skeleton` 骨架屏，模拟文件树的结构（文件夹+文件）。
  - 替换掉现在的 `animate-spin` 逻辑（或者保留作为辅助），主要视觉反馈改为骨架屏。

## 3. 优化 `ConnectionManager` 组件 (左侧连接列表)
- **现状**: 完全没有 Loading 状态。
- **改进**:
  - 添加 `isLoading` 状态。
  - 在 `loadConnections` 期间，展示连接卡片的骨架屏（模拟卡片布局）。

## 4. 优化 `ValueEditor` 组件 (右侧编辑区)
- **现状**: 点击 Key 加载 Value 时没有反馈。
- **改进**:
  - 添加 `isLoading` 状态。
  - 在 `loadValue` 期间，编辑器区域显示骨架屏（模拟编辑器和按钮组）。

## 5. 实施步骤
1.  **安装**: 运行 shadcn 命令添加 skeleton。
2.  **KeyList**: 修改 `KeyList.tsx`，引入 `Skeleton`，在 `loading` 为 true 时渲染骨架树。
3.  **ConnectionManager**: 修改 `ConnectionManager.tsx`，添加 `isLoading` 状态，渲染连接卡片骨架。
4.  **ValueEditor**: 修改 `ValueEditor.tsx`，添加 `isLoading` 状态，渲染编辑器骨架。
