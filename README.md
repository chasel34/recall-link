# Recall Link

AI 书签应用 - Monorepo

## 项目结构

这是一个使用 [Turborepo](https://turborepo.com/) 构建的 monorepo 项目。

```
recall-link/
├── apps/           # 应用程序目录
├── packages/       # 共享包目录
├── turbo.json      # Turborepo 配置
└── pnpm-workspace.yaml
```

## 开始使用

### 安装依赖

```bash
pnpm install
```

### 常用命令

```bash
# 开发模式
pnpm dev

# 构建所有项目
pnpm build

# 代码检查
pnpm lint

# 类型检查
pnpm check-types

# 代码格式化
pnpm format
```

## 添加新应用或包

- 在 `apps/` 目录下创建新的应用程序
- 在 `packages/` 目录下创建共享的库和配置

## 技术栈

- **包管理器**: pnpm
- **构建系统**: Turborepo
- **语言**: TypeScript
