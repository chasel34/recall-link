# Frontend Design - Recall Link Web Interface

**Date:** 2026-01-21
**Status:** Design Complete, Ready for Implementation

## Overview

设计并实现 Recall Link 的前端 Web 界面，提供现代化的用户体验来浏览、搜索和管理保存的网页。

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Routing:** TanStack Router（类型安全路由）
- **UI Components:** shadcn/ui + Tailwind CSS
- **Data Fetching:** TanStack Query（数据获取和缓存）
- **State Management:** Zustand（轻量状态管理，用于 UI 状态如侧边栏折叠）
- **Validation:** Zod（表单验证）

## Project Structure

```
apps/web/
├── src/
│   ├── components/     # 通用组件
│   │   ├── ui/        # shadcn/ui 组件
│   │   └── layout/    # 布局组件（Sidebar, Header）
│   ├── features/      # 功能模块
│   │   ├── items/     # 记录功能
│   │   ├── chat/      # 对话功能（占坑）
│   │   └── settings/  # 设置功能（占坑）
│   ├── lib/           # 工具函数、API client
│   ├── routes/        # TanStack Router 路由
│   └── hooks/         # 自定义 hooks
├── public/            # 静态资源
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## Routing Structure

```typescript
/                          # 根布局（包含侧边栏）
├── /items                 # 记录页（默认首页）
│   ├── /items/           # 列表视图（全部）
│   ├── /items/tags/$tag  # 按标签筛选
│   └── /items/$id        # 详情页（独立页面）
├── /chat                  # 对话页（占坑，禁用状态）
└── /settings              # 设置页（占坑，禁用状态）
```

### URL State Management

- 使用 TanStack Router 的 search params 管理筛选、排序、分页状态
- URL 即状态，可分享和书签
- 示例：`/items?sort=created_desc&page=2&q=keyword`

## Layout Design

### 一级导航 - Sidebar

使用 shadcn/ui 的 `Sidebar` 组件体系（`SidebarProvider`、`SidebarTrigger`、`SidebarContent` 等）

**结构：**
```
┌─────────────┐
│ Logo/Brand  │  # SidebarHeader
├─────────────┤
│ 🗂️  记录    │  # SidebarMenuItem（激活）
│ 💬  对话    │  # SidebarMenuItem（禁用）
│ ⚙️  设置    │  # SidebarMenuItem（禁用）
└─────────────┘
```

**特性：**
- 自动处理折叠/展开动画
- 响应式设计（移动端自动切换为抽屉）
- 内置键盘快捷键支持
- 宽度约 240px

### 记录页布局

```
┌─────────────┬──────────────────────────────────┐
│ Sidebar     │  [搜索框 + 模式切换]              │  # 顶部导航栏
│ (一级导航)  ├──────────────────────────────────┤
│             │                                  │
├─────────────┤  卡片网格区域                     │  # 主内容
│ 全部        │  ┌────┐ ┌────┐ ┌────┐           │
│             │  │卡片│ │卡片│ │卡片│           │
│ 标签列表:   │  └────┘ └────┘ └────┘           │
│ □ 技术 (12) │  ┌────┐ ┌────┐                  │
│ □ 设计 (8)  │  │卡片│ │卡片│                  │
│ □ 产品 (5)  │  └────┘ └────┘                  │
│ ...         │                                  │
└─────────────┴──────────────────────────────────┘
```

**左侧二级导航（标签区域，宽度约 200px）：**
- "全部" 放在最上面（高亮显示当前选中）
- 下方滚动列表显示所有标签，格式：`标签名 (数量)`
- 点击标签 → 路由变为 `/items/tags/$tag`

**顶部搜索栏：**
- 搜索框（shadcn/ui `Input`）
- 右侧模式切换（`ToggleGroup`）：`内容` / `标签`
  - 内容模式：全文搜索 items（后端 FTS）
  - 标签模式：前端过滤左侧标签列表
- 右侧 `+ 保存网页` 按钮

## Component Design

### 卡片视图（ItemCard）

```
┌──────────────────────────┐
│ [缩略图/favicon]          │  # 顶部图片区（高度 160px）
├──────────────────────────┤
│ 标题文字（最多2行）       │  # 标题区
│ 摘要文字（最多3行）...    │  # AI 生成的摘要
│                          │
│ 🏷️ tag1  tag2  tag3      │  # 标签（最多显示3个 + more）
│                          │
│ example.com  • 2天前     │  # 底部元信息
└──────────────────────────┘
```

**布局：**
- 响应式网格：`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- 卡片宽度自适应，最小宽度 280px

**交互：**
- Hover：卡片轻微上浮 + 阴影加深
- 点击卡片 → 跳转到详情页 `/items/$id`
- 使用 shadcn/ui `Card` 组件

### 详情页（ItemDetail）

```
┌────────────────────────────────────────────┐
│ ← 返回    [编辑标签] [删除]                 │  # 顶部操作栏
├────────────────────────────────────────────┤
│                                            │
│  # 页面标题                                │  # 文章主体区域
│  🔗 https://example.com/article            │  # （最大宽度 800px 居中）
│  📅 保存于 2024-01-20                      │
│                                            │
│  ─────────────────────────────────         │
│                                            │
│  AI 摘要：                                 │
│  这是一篇关于...的文章，主要讲述了...      │
│                                            │
│  ─────────────────────────────────         │
│                                            │
│  🏷️ 技术  前端  React  [+ 添加标签]       │  # 标签区（可编辑）
│                                            │
│  ─────────────────────────────────         │
│                                            │
│  [完整网页内容 / Readability 提取的正文]    │  # 内容区
│                                            │
└────────────────────────────────────────────┘
```

**功能点：**
- 返回按钮 → 使用 `router.history.back()` 保持列表位置
- 编辑标签 → 点击进入编辑模式，支持添加/删除
- 内容渲染 → 使用 `dangerouslySetInnerHTML` 渲染 HTML（需要 sanitize）
- 删除确认 → 使用 shadcn/ui `AlertDialog`

### 保存网页 Dialog

**触发入口：**
1. 顶部导航栏右侧 `+ 保存网页` 按钮
2. 列表为空时的空状态大按钮

**Dialog 内容：**
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>保存网页</DialogTitle>
    </DialogHeader>
    <Input
      placeholder="输入网页 URL"
      autoFocus
      value={url}
      onChange={handleUrlChange}
    />
    {error && <Alert variant="destructive">{error}</Alert>}
    <DialogFooter>
      <Button variant="outline" onClick={close}>取消</Button>
      <Button onClick={handleSave}>保存</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**流程：**
```
点击保存
  ↓
验证 URL（Zod schema）
  ↓
POST /api/items { url }
  ↓
成功：
  - 关闭 Dialog
  - Toast: "已保存，正在处理..."
  - 新 item 出现在列表顶部（status: pending）
  ↓
// TODO: 实现 SSE 推送以实时更新 job 状态
// 目前：用户刷新页面时获取最新状态
```

## Data Layer

### API Client

```typescript
// lib/api-client.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const api = {
  items: {
    list: (params?: { tag?: string; page?: number; q?: string }) =>
      fetch(`${API_BASE}/api/items?${new URLSearchParams(params)}`).then(r => r.json()),

    get: (id: string) =>
      fetch(`${API_BASE}/api/items/${id}`).then(r => r.json()),

    create: (url: string) =>
      fetch(`${API_BASE}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }).then(r => r.json()),

    update: (id: string, data: UpdateItemDto) =>
      fetch(`${API_BASE}/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json()),

    delete: (id: string) =>
      fetch(`${API_BASE}/api/items/${id}`, { method: 'DELETE' })
  },

  tags: {
    list: () =>
      fetch(`${API_BASE}/api/tags`).then(r => r.json())
  }
}
```

### TanStack Query Integration

```typescript
// hooks/useItems.ts
export const useItems = (params: { tag?: string; page?: number; q?: string }) => {
  return useQuery({
    queryKey: ['items', params],
    queryFn: () => api.items.list(params)
  })
}

// hooks/useItem.ts
export const useItem = (id: string) => {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => api.items.get(id)
  })
}

// hooks/useCreateItem.ts
export const useCreateItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => api.items.create(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    }
  })
}
```

## Search Feature

### Frontend

**搜索模式切换：**
```tsx
<ToggleGroup type="single" value={searchMode} onValueChange={setSearchMode}>
  <ToggleGroupItem value="content">内容</ToggleGroupItem>
  <ToggleGroupItem value="tags">标签</ToggleGroupItem>
</ToggleGroup>
```

**搜索行为：**
- **内容模式**：调用后端 API `GET /api/items?q=keyword`，在卡片区显示结果
- **标签模式**：客户端过滤标签列表（简单字符串匹配）

### Backend API

**Endpoint:** `GET /api/items?q=keyword&page=1&limit=20`

**实现：**
- 使用 SQLite FTS5 查询 `items_fts` 表
- 支持分页（limit/offset）
- 按相关性排序（FTS5 rank）

**Response:**
```json
{
  "items": [
    {
      "id": "item_xxx",
      "url": "...",
      "title": "...",
      "summary": "...",
      "tags": ["tag1", "tag2"],
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

## Loading & Error States

### Loading States

**列表页：**
```tsx
{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
  </div>
) : (
  <ItemsGrid items={data.items} />
)}
```

**详情页：**
- 全屏骨架屏（Skeleton）
- 模拟标题、元信息、内容区域

### Error Handling

**网络错误：**
- 使用 shadcn/ui `Alert` 组件显示错误消息
- 提供重试按钮

**404 错误：**
- 详情页不存在 → 显示空状态 + 返回按钮

**空状态：**
- 无搜索结果 → "未找到相关内容"
- 标签下无内容 → "该标签下暂无保存的网页"

### Toast Notifications

使用 shadcn/ui `Toast` 显示操作反馈：
- ✓ 保存成功
- ✓ 删除成功
- ✓ 标签更新成功
- ✗ 操作失败

## Responsive Design

### Breakpoints

- **Mobile:** < 768px
  - 单列卡片
  - 一级 Sidebar 默认收起（汉堡菜单）
  - 二级导航（标签）改为顶部滚动 tabs

- **Tablet:** 768-1024px
  - 双列卡片
  - Sidebar 可折叠

- **Desktop:** > 1024px
  - 三列或四列卡片
  - Sidebar 默认展开

### Accessibility

- 所有交互元素支持键盘导航（Tab/Enter/Escape）
- 使用 shadcn/ui 组件自带的 ARIA 属性
- 图片添加 alt 文本
- 合适的焦点指示器

### Performance

- 卡片图片懒加载（`loading="lazy"`）
- 虚拟滚动（如列表超过 100 项，使用 @tanstack/react-virtual）
- 路由代码分割（React.lazy + Suspense）

## Dependencies

**主要依赖（使用最新版本）：**
```json
{
  "dependencies": {
    "@tanstack/react-router": "latest",
    "@tanstack/react-query": "latest",
    "react": "latest",
    "react-dom": "latest",
    "zustand": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "typescript": "latest",
    "vite": "latest",
    "tailwindcss": "latest",
    "autoprefixer": "latest",
    "postcss": "latest"
  }
}
```

**shadcn/ui 组件清单：**
- Sidebar, Button, Card, Input, Tabs
- DropdownMenu, ToggleGroup, Dialog, Alert, AlertDialog
- Toast, Skeleton, Badge

**环境变量：**
```env
VITE_API_URL=http://localhost:8787
```

## Implementation Notes

### Before Starting

1. **获取最新文档：**
   - 使用 context7 获取以下包的最新文档：
     - @tanstack/react-router
     - @tanstack/react-query
     - shadcn/ui
     - React 18
     - Vite

2. **使用 git worktree：**
   - 创建独立分支进行开发
   - 避免干扰主分支

### TODO Items

- [ ] **SSE 实时更新：** 实现服务端推送以实时更新 job 状态（fetch/ai_process 完成时）
- [ ] **最近访问功能：** 后端记录访问历史，前端展示最近访问列表
- [ ] **收藏功能：** 后端添加 favorited 字段，前端添加收藏入口
- [ ] **对话页面：** 实现 RAG 对话功能
- [ ] **设置页面：** API key 配置、主题设置等

### Future Enhancements

- 批量操作（批量删除、批量添加标签）
- 导出功能（Markdown、JSON）
- 深色模式
- PWA 支持（离线访问）
- 标签管理（重命名、合并、删除）

## Success Criteria

- ✅ 能够浏览所有保存的网页（卡片视图）
- ✅ 能够查看单个网页的详细内容
- ✅ 能够通过标签筛选内容
- ✅ 能够全文搜索保存的内容
- ✅ 能够保存新的网页
- ✅ 能够编辑和删除网页
- ✅ 响应式设计，支持移动端
- ✅ 加载状态和错误处理完善
