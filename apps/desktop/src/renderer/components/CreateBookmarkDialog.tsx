import { useState } from 'react';
import { X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookmarkStore } from '@/store';
import { cn } from '@/lib/utils';

interface CreateBookmarkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateBookmarkDialog({ open, onOpenChange }: CreateBookmarkDialogProps) {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const addBookmark = useBookmarkStore((s) => s.addBookmark);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 验证 URL
        if (!url.trim()) {
            setError('请输入网页链接');
            return;
        }

        try {
            new URL(url);
        } catch {
            setError('请输入有效的网页链接');
            return;
        }

        setIsSubmitting(true);

        // 模拟提交延迟
        await new Promise((resolve) => setTimeout(resolve, 500));

        addBookmark({ url, title: title || undefined, note: note || undefined });

        // 重置表单
        setUrl('');
        setTitle('');
        setNote('');
        setIsSubmitting(false);
        onOpenChange(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* 对话框 */}
            <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl">
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">新建收藏</h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* URL 输入 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            网页链接 <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/article"
                                className={cn(
                                    'w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-sm',
                                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                                    error ? 'border-destructive' : 'border-input'
                                )}
                            />
                        </div>
                        {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>

                    {/* 标题输入（可选） */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            标题{' '}
                            <span className="text-muted-foreground text-xs">
                                （可选，默认自动获取）
                            </span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="自定义标题"
                            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* 备注输入（可选） */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            备注 <span className="text-muted-foreground text-xs">（可选）</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="添加一些备注..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                    </div>

                    {/* 提交按钮 */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            取消
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                '保存'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
