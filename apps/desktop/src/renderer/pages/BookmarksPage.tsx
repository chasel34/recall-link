import { useState } from 'react';
import { Search, ExternalLink, Trash2, Calendar, Globe, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookmarkStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Bookmark } from '@/types';

export function BookmarksPage() {
    const searchQuery = useBookmarkStore((s) => s.searchQuery);
    const setSearchQuery = useBookmarkStore((s) => s.setSearchQuery);
    const getFilteredBookmarks = useBookmarkStore((s) => s.getFilteredBookmarks);
    const getAllTags = useBookmarkStore((s) => s.getAllTags);
    const selectedTags = useBookmarkStore((s) => s.selectedTags);
    const setSelectedTags = useBookmarkStore((s) => s.setSelectedTags);
    const deleteBookmark = useBookmarkStore((s) => s.deleteBookmark);

    const bookmarks = getFilteredBookmarks();
    const allTags = getAllTags();

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return '今天';
        if (days === 1) return '昨天';
        if (days < 7) return `${days} 天前`;
        if (days < 30) return `${Math.floor(days / 7)} 周前`;
        return date.toLocaleDateString('zh-CN');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部搜索栏 */}
            <header className="p-4 border-b border-border bg-card/30">
                <div className="relative max-w-2xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索标题、标签，或者直接用一句话问问题..."
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
            </header>

            {/* 主内容区 */}
            <div className="flex-1 overflow-auto p-4">
                {/* 页面标题和筛选 */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                        全部收藏
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({bookmarks.length} 条)
                        </span>
                    </h2>
                </div>

                {/* 标签筛选 */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {allTags.slice(0, 10).map((tag) => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                                    selectedTags.includes(tag)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-accent text-accent-foreground hover:bg-accent/80'
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                        {selectedTags.length > 0 && (
                            <button
                                onClick={() => setSelectedTags([])}
                                className="px-3 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                                清除筛选
                            </button>
                        )}
                    </div>
                )}

                {/* 收藏列表 */}
                <div className="space-y-3">
                    {bookmarks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>暂无收藏</p>
                            <p className="text-sm mt-1">点击左下角的"新建收藏"开始添加</p>
                        </div>
                    ) : (
                        bookmarks.map((bookmark) => (
                            <BookmarkCard
                                key={bookmark.id}
                                bookmark={bookmark}
                                onDelete={deleteBookmark}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

interface BookmarkCardProps {
    bookmark: Bookmark;
    onDelete: (id: string) => void;
}

function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        setTimeout(() => {
            onDelete(bookmark.id);
        }, 300);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div
            className={cn(
                'group p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-all',
                isDeleting && 'opacity-50 scale-98'
            )}
        >
            {/* 标题行 */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate selectable">
                        {bookmark.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {bookmark.domain}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            收藏于 {formatDate(bookmark.createdAt)}
                        </span>
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(bookmark.url, '_blank')}
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={handleDelete}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* 摘要 */}
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2 selectable">
                {bookmark.status === 'processing' ? (
                    <span className="flex items-center gap-2 text-primary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        正在分析中...
                    </span>
                ) : (
                    bookmark.summary
                )}
            </p>

            {/* 标签 */}
            {bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {bookmark.tags.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-md"
                        >
                            <Tag className="w-3 h-3" />
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
