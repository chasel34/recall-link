import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Bookmark, MessageSquare, Plus, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CreateBookmarkDialog } from '@/components/CreateBookmarkDialog';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const routerState = useRouterState();
    const currentPath = routerState.location.pathname;

    const navItems = [
        { path: '/', label: '全部收藏', icon: Bookmark },
        { path: '/chat', label: 'AI 对话', icon: MessageSquare },
    ];

    return (
        <div className="flex h-screen bg-background">
            {/* 侧边栏 */}
            <aside className="w-60 border-r border-border flex flex-col bg-card/50">
                {/* Logo */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
                            <Bookmark className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-foreground">RecallLink</h1>
                            <p className="text-xs text-muted-foreground">个人知识库</p>
                        </div>
                    </div>
                </div>

                {/* 导航菜单 */}
                <nav className="flex-1 p-2 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                currentPath === item.path
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* 底部操作 */}
                <div className="p-3 border-t border-border space-y-2">
                    <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="w-full gap-2"
                        variant="default"
                    >
                        <Plus className="w-4 h-4" />
                        新建收藏
                    </Button>
                    <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                        <Settings className="w-4 h-4" />
                        设置
                    </Button>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="flex-1 flex flex-col overflow-hidden">{children}</main>

            {/* 新建收藏对话框 */}
            <CreateBookmarkDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
        </div>
    );
}
