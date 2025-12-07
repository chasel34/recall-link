import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookmarksPage } from '@/pages/BookmarksPage';
import { ChatPage } from '@/pages/ChatPage';

// 根路由 - 包含 Layout
const rootRoute = createRootRoute({
    component: () => (
        <AppLayout>
            <Outlet />
        </AppLayout>
    ),
});

// 收藏页面路由
const bookmarksRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: BookmarksPage,
});

// AI 对话路由
const chatRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/chat',
    component: ChatPage,
});

// 路由树
const routeTree = rootRoute.addChildren([bookmarksRoute, chatRoute]);

// 创建路由器
export const router = createRouter({ routeTree });

// 类型声明
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
