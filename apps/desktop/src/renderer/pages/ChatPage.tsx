import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Link as LinkIcon, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/store';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

export function ChatPage() {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const getCurrentSession = useChatStore((s) => s.getCurrentSession);
    const sendMessage = useChatStore((s) => s.sendMessage);
    const isLoading = useChatStore((s) => s.isLoading);

    const session = getCurrentSession();
    const messages = session?.messages || [];

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        sendMessage(inputValue.trim());
        setInputValue('');
    };

    const quickQuestions = [
        '你收藏的哪些文章讲过 React 性能优化？',
        '帮我总结一下关于 TypeScript 的收藏',
        '最近收藏的文章有哪些？',
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部标题 */}
            <header className="p-4 border-b border-border bg-card/30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-foreground">AI 知识助手</h2>
                        <p className="text-xs text-muted-foreground">基于你的收藏内容回答问题</p>
                    </div>
                </div>
            </header>

            {/* 消息列表 */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                ))}

                {/* 加载中状态 */}
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">正在搜索你的知识库...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 快捷问题（当消息较少时显示） */}
                {messages.length <= 1 && !isLoading && (
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-3">试试这些问题：</p>
                        <div className="flex flex-wrap gap-2">
                            {quickQuestions.map((question, index) => (
                                <button
                                    key={index}
                                    onClick={() => setInputValue(question)}
                                    className="px-3 py-2 bg-accent hover:bg-accent/80 text-accent-foreground text-sm rounded-lg transition-colors text-left"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t border-border bg-card/30">
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder="问问我：你收藏的哪些文章讲过 React 性能优化？"
                            rows={1}
                            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                    </div>
                    <Button
                        type="submit"
                        size="lg"
                        className="h-12 w-12 p-0 rounded-xl shrink-0"
                        disabled={!inputValue.trim() || isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

interface MessageBubbleProps {
    message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
            {/* 头像 */}
            <div
                className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gradient-to-br from-primary to-blue-400'
                )}
            >
                {isUser ? (
                    <span className="text-xs font-medium">我</span>
                ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                )}
            </div>

            {/* 消息内容 */}
            <div
                className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    isUser
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-card border border-border rounded-tl-none'
                )}
            >
                <div
                    className={cn(
                        'text-sm selectable whitespace-pre-wrap',
                        !isUser && 'prose prose-sm prose-invert max-w-none'
                    )}
                >
                    {message.content}
                </div>

                {/* 引用来源 */}
                {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">引用来源</p>
                        {message.sources.map((source, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-background/50 rounded-lg text-xs"
                            >
                                <LinkIcon className="w-3 h-3 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                        {source.title}
                                    </p>
                                    <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <span>{source.domain}</span>
                                        <span>·</span>
                                        <span className="flex items-center gap-0.5">
                                            <Calendar className="w-3 h-3" />
                                            收藏于{' '}
                                            {source.savedAt.toLocaleDateString('zh-CN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
