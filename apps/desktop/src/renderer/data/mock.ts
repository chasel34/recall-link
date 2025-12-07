import type { Bookmark, ChatSession } from '@/types';

// Mock 收藏数据
export const mockBookmarks: Bookmark[] = [
    {
        id: '1',
        url: 'https://web.dev/articles/vitals',
        title: 'Web Vitals - Essential metrics for a healthy site',
        domain: 'web.dev',
        summary:
            '这篇文章详细介绍了 Google 提出的 Core Web Vitals 核心指标，包括 LCP（最大内容绘制）、FID（首次输入延迟）和 CLS（累积布局偏移）。文章解释了每个指标的含义、测量方法以及优化建议。',
        tags: ['Web 性能', '前端', 'Google'],
        content: '完整的文章内容...',
        language: 'en',
        wordCount: 2500,
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-01'),
        fetchedAt: new Date('2024-12-01'),
        status: 'completed',
        isUserEdited: false,
    },
    {
        id: '2',
        url: 'https://react.dev/learn/you-might-not-need-an-effect',
        title: 'You Might Not Need an Effect',
        domain: 'react.dev',
        summary:
            '这篇 React 官方文档详细解释了何时应该使用 useEffect，何时不需要。核心观点是：如果你的代码是为了响应用户交互而非同步外部系统，那可能不需要 Effect。文章提供了多个常见场景的正确处理方式。',
        tags: ['React', 'Hooks', '最佳实践'],
        content: '完整的文章内容...',
        language: 'en',
        wordCount: 3200,
        createdAt: new Date('2024-11-28'),
        updatedAt: new Date('2024-11-28'),
        fetchedAt: new Date('2024-11-28'),
        status: 'completed',
        isUserEdited: false,
    },
    {
        id: '3',
        url: 'https://www.smashingmagazine.com/2024/01/deep-dive-react-performance/',
        title: 'A Deep Dive into React Performance Optimization',
        domain: 'smashingmagazine.com',
        summary:
            '深度解析 React 性能优化技巧。核心要点包括使用 React.memo 防止不必要的组件重渲染，通过 useCallback 和 useMemo 来记忆函数和值，以及利用代码分割和懒加载来减少初始加载时间。',
        tags: ['React', '性能优化', '前端'],
        content: '完整的文章内容...',
        language: 'en',
        wordCount: 4100,
        createdAt: new Date('2024-11-25'),
        updatedAt: new Date('2024-11-25'),
        fetchedAt: new Date('2024-11-25'),
        status: 'completed',
        isUserEdited: false,
    },
    {
        id: '4',
        url: 'https://ui.dev/useeffect',
        title: 'Optimizing React: memo, useCallback, and useMemo',
        domain: 'ui.dev',
        summary:
            '详细讲解 React 的三个核心性能优化 API：React.memo 用于组件记忆化，useCallback 用于回调函数缓存，useMemo 用于计算值缓存。文章通过实际示例展示了每种方法的正确使用场景。',
        tags: ['React', 'Hooks', '性能优化'],
        content: '完整的文章内容...',
        language: 'en',
        wordCount: 2800,
        createdAt: new Date('2024-11-20'),
        updatedAt: new Date('2024-11-20'),
        fetchedAt: new Date('2024-11-20'),
        status: 'completed',
        isUserEdited: false,
    },
    {
        id: '5',
        url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html',
        title: 'TypeScript Utility Types',
        domain: 'typescriptlang.org',
        summary:
            'TypeScript 内置工具类型完全指南。涵盖 Partial、Required、Pick、Omit、Record 等常用类型，以及 Exclude、Extract、NonNullable 等高级类型操作。每个类型都配有详细示例。',
        tags: ['TypeScript', '类型系统', '前端'],
        content: '完整的文章内容...',
        language: 'en',
        wordCount: 1800,
        createdAt: new Date('2024-11-15'),
        updatedAt: new Date('2024-11-15'),
        fetchedAt: new Date('2024-11-15'),
        status: 'completed',
        isUserEdited: false,
    },
    {
        id: '6',
        url: 'https://css-tricks.com/a-complete-guide-to-css-grid/',
        title: 'A Complete Guide to CSS Grid',
        domain: 'css-tricks.com',
        summary:
            'CSS Grid 布局完全指南，从基础概念到高级技巧。包括 grid-template、grid-area、fr 单位、minmax() 函数等核心知识点，以及响应式布局的最佳实践。',
        tags: ['CSS', 'Grid', '前端'],
        content: '完整的文章内容...',
        language: 'en',
        wordCount: 5200,
        createdAt: new Date('2024-11-10'),
        updatedAt: new Date('2024-11-10'),
        fetchedAt: new Date('2024-11-10'),
        status: 'completed',
        isUserEdited: false,
    },
    {
        id: '7',
        url: 'https://techcrunch.com/2024/03/ai-productivity-tools-analysis/',
        title: 'AI 时代的生产力工具分析',
        domain: 'techcrunch.com',
        summary:
            '深度分析当前 AI 生产力工具的发展趋势和市场格局。文章比较了 ChatGPT、Claude、Notion AI 等主流工具的优劣势，并预测了未来的发展方向。',
        tags: ['AI', '生产力', '行业分析'],
        content: '完整的文章内容...',
        language: 'zh',
        wordCount: 3500,
        createdAt: new Date('2024-11-05'),
        updatedAt: new Date('2024-11-05'),
        fetchedAt: new Date('2024-11-05'),
        status: 'completed',
        isUserEdited: false,
    },
    {
        id: '8',
        url: 'https://medium.com/design-system-from-scratch',
        title: 'Building a Design System from Scratch',
        domain: 'medium.com',
        summary:
            '从零构建设计系统的实战指南。涵盖设计令牌（Design Tokens）、组件库架构、文档化以及版本管理等关键话题。适合希望在团队中推行设计系统的开发者和设计师。',
        tags: ['设计系统', '前端', 'UI/UX'],
        content: '完整的文章内容...',
        language: 'en',
        wordCount: 4600,
        createdAt: new Date('2024-10-28'),
        updatedAt: new Date('2024-10-28'),
        fetchedAt: new Date('2024-10-28'),
        status: 'completed',
        isUserEdited: false,
    },
];

// Mock 对话数据
export const mockChatSessions: ChatSession[] = [
    {
        id: '1',
        title: 'React 性能优化讨论',
        messages: [
            {
                id: 'm1',
                role: 'assistant',
                content: '你好！今天我能怎样帮助你探索你的知识库？',
                createdAt: new Date('2024-12-01T10:00:00'),
            },
        ],
        createdAt: new Date('2024-12-01T10:00:00'),
        updatedAt: new Date('2024-12-01T10:00:00'),
    },
];

// 模拟 AI 回复
export function generateMockAIResponse(userMessage: string): {
    content: string;
    sources: { bookmarkId: string; title: string; domain: string; savedAt: Date }[];
} {
    // 简单的关键词匹配来生成模拟回复
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('react') && lowerMessage.includes('性能')) {
        return {
            content: `当然，我在你的知识库中找到了几篇关于 React 性能优化的文章。核心要点包括使用 \`React.memo\` 来防止不必要的组件重渲染，通过 \`useCallback\` 和 \`useMemo\` 来记忆函数和值，以及利用代码分割和懒加载来减少初始加载时间。

**主要优化策略：**
1. 使用 React.memo 包裹纯展示组件
2. 用 useMemo 缓存昂贵的计算
3. 用 useCallback 避免回调函数导致的重渲染
4. 实现虚拟列表处理大数据集
5. 使用 React.lazy 和 Suspense 进行代码分割`,
            sources: [
                {
                    bookmarkId: '3',
                    title: 'A Deep Dive into React Performance Optimization',
                    domain: 'smashingmagazine.com',
                    savedAt: new Date('2024-11-25'),
                },
                {
                    bookmarkId: '4',
                    title: 'Optimizing React: memo, useCallback, and useMemo',
                    domain: 'ui.dev',
                    savedAt: new Date('2024-11-20'),
                },
            ],
        };
    }

    if (lowerMessage.includes('typescript') || lowerMessage.includes('类型')) {
        return {
            content: `关于 TypeScript，我在你的收藏中找到了相关内容。TypeScript 提供了丰富的内置工具类型，可以帮助你更好地操作和转换类型。

**常用工具类型：**
- \`Partial<T>\`: 将所有属性变为可选
- \`Required<T>\`: 将所有属性变为必需
- \`Pick<T, K>\`: 从类型中选取指定属性
- \`Omit<T, K>\`: 从类型中排除指定属性
- \`Record<K, T>\`: 创建键值对类型`,
            sources: [
                {
                    bookmarkId: '5',
                    title: 'TypeScript Utility Types',
                    domain: 'typescriptlang.org',
                    savedAt: new Date('2024-11-15'),
                },
            ],
        };
    }

    if (
        lowerMessage.includes('css') ||
        lowerMessage.includes('grid') ||
        lowerMessage.includes('布局')
    ) {
        return {
            content: `关于 CSS Grid 布局，你的收藏中有一篇非常全面的指南。CSS Grid 是现代网页布局的强大工具。

**核心概念：**
- \`grid-template-columns/rows\`: 定义网格轨道
- \`fr\` 单位: 弹性分配剩余空间
- \`grid-area\`: 定义区域布局
- \`minmax()\`: 设置轨道尺寸范围
- \`auto-fit/auto-fill\`: 自动响应式布局`,
            sources: [
                {
                    bookmarkId: '6',
                    title: 'A Complete Guide to CSS Grid',
                    domain: 'css-tricks.com',
                    savedAt: new Date('2024-11-10'),
                },
            ],
        };
    }

    // 默认回复
    return {
        content: `我在你的知识库中搜索了相关内容，但没有找到与"${userMessage}"完全匹配的文章。你可以尝试：

1. 使用不同的关键词搜索
2. 浏览全部收藏列表
3. 添加更多相关网页到你的知识库

需要我用通用知识来回答这个问题吗？`,
        sources: [],
    };
}
