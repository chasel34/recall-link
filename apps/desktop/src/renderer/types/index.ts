// 收藏条目类型
export interface Bookmark {
    id: string;
    url: string;
    title: string;
    domain: string;
    summary: string;
    tags: string[];
    content: string;
    language: 'zh' | 'en';
    wordCount: number;
    createdAt: Date;
    updatedAt: Date;
    fetchedAt: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    isUserEdited: boolean;
}

// 对话消息类型
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: BookmarkSource[];
    createdAt: Date;
}

// 引用来源
export interface BookmarkSource {
    bookmarkId: string;
    title: string;
    domain: string;
    savedAt: Date;
}

// 对话会话
export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

// 新建收藏表单
export interface CreateBookmarkForm {
    url: string;
    title?: string;
    note?: string;
}
