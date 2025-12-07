import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Bookmark, Plus, Search, Sparkles } from 'lucide-react';

function App() {
    const [count, setCount] = useState(0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
                        <Sparkles className="w-4 h-4" />
                        AI 驱动
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                        Recall Link
                    </h1>
                    <p className="text-muted-foreground text-lg">智能书签管理，让知识触手可及</p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                                <Plus className="w-5 h-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">快速收藏</CardTitle>
                            <CardDescription>一键保存任何网页，自动提取关键信息</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                                <Search className="w-5 h-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">智能搜索</CardTitle>
                            <CardDescription>AI 理解你的意图，精准找到所需内容</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                                <Bookmark className="w-5 h-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">自动分类</CardTitle>
                            <CardDescription>智能标签和分类，让书签井井有条</CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                {/* Demo Card */}
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle>组件示例</CardTitle>
                        <CardDescription>使用 React + Tailwind + shadcn/ui 构建</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            点击按钮测试 React 状态:{' '}
                            <span className="text-primary font-semibold">{count}</span>
                        </p>
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Button onClick={() => setCount(count + 1)}>增加计数</Button>
                        <Button variant="outline" onClick={() => setCount(0)}>
                            重置
                        </Button>
                        <Button variant="secondary">次要按钮</Button>
                        <Button variant="ghost">Ghost</Button>
                    </CardFooter>
                </Card>

                {/* Footer */}
                <div className="text-center text-sm text-muted-foreground">
                    Electron + Vite + React + Tailwind + shadcn/ui
                </div>
            </div>
        </div>
    );
}

export default App;
