import { create } from 'zustand';
import type { Bookmark, ChatMessage, ChatSession, CreateBookmarkForm } from '@/types';
import { mockBookmarks, mockChatSessions, generateMockAIResponse } from '@/data/mock';

// 收藏 Store
interface BookmarkState {
    bookmarks: Bookmark[];
    isLoading: boolean;
    searchQuery: string;
    selectedTags: string[];
    addBookmark: (form: CreateBookmarkForm) => void;
    deleteBookmark: (id: string) => void;
    setSearchQuery: (query: string) => void;
    setSelectedTags: (tags: string[]) => void;
    getFilteredBookmarks: () => Bookmark[];
    getAllTags: () => string[];
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
    bookmarks: mockBookmarks,
    isLoading: false,
    searchQuery: '',
    selectedTags: [],

    addBookmark: (form) => {
        const newBookmark: Bookmark = {
            id: Date.now().toString(),
            url: form.url,
            title: form.title || new URL(form.url).hostname,
            domain: new URL(form.url).hostname,
            summary: '正在分析中...',
            tags: [],
            content: '',
            language: 'zh',
            wordCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            fetchedAt: new Date(),
            status: 'processing',
            isUserEdited: false,
        };

        set((state) => ({
            bookmarks: [newBookmark, ...state.bookmarks],
        }));

        // 模拟 AI 处理
        setTimeout(() => {
            set((state) => ({
                bookmarks: state.bookmarks.map((b) =>
                    b.id === newBookmark.id
                        ? {
                              ...b,
                              status: 'completed' as const,
                              summary: '这是一篇 AI 自动生成的摘要，总结了网页的核心内容。',
                              tags: ['新收藏', '待整理'],
                          }
                        : b
                ),
            }));
        }, 2000);
    },

    deleteBookmark: (id) => {
        set((state) => ({
            bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
    },

    setSearchQuery: (query) => set({ searchQuery: query }),

    setSelectedTags: (tags) => set({ selectedTags: tags }),

    getFilteredBookmarks: () => {
        const { bookmarks, searchQuery, selectedTags } = get();
        return bookmarks.filter((b) => {
            const matchesSearch =
                !searchQuery ||
                b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesTags =
                selectedTags.length === 0 || selectedTags.some((tag) => b.tags.includes(tag));

            return matchesSearch && matchesTags;
        });
    },

    getAllTags: () => {
        const { bookmarks } = get();
        const tagsSet = new Set<string>();
        bookmarks.forEach((b) => b.tags.forEach((t) => tagsSet.add(t)));
        return Array.from(tagsSet).sort();
    },
}));

// 对话 Store
interface ChatState {
    sessions: ChatSession[];
    currentSessionId: string | null;
    isLoading: boolean;
    createSession: () => string;
    sendMessage: (content: string) => void;
    getCurrentSession: () => ChatSession | null;
}

export const useChatStore = create<ChatState>((set, get) => ({
    sessions: mockChatSessions,
    currentSessionId: mockChatSessions[0]?.id || null,
    isLoading: false,

    createSession: () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: '新对话',
            messages: [
                {
                    id: `m-${Date.now()}`,
                    role: 'assistant',
                    content: '你好！今天我能怎样帮助你探索你的知识库？',
                    createdAt: new Date(),
                },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id,
        }));

        return newSession.id;
    },

    sendMessage: (content) => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        const userMessage: ChatMessage = {
            id: `m-${Date.now()}`,
            role: 'user',
            content,
            createdAt: new Date(),
        };

        // 添加用户消息
        set((state) => ({
            sessions: state.sessions.map((s) =>
                s.id === currentSessionId
                    ? {
                          ...s,
                          messages: [...s.messages, userMessage],
                          updatedAt: new Date(),
                      }
                    : s
            ),
            isLoading: true,
        }));

        // 模拟 AI 回复
        setTimeout(() => {
            const response = generateMockAIResponse(content);
            const assistantMessage: ChatMessage = {
                id: `m-${Date.now()}`,
                role: 'assistant',
                content: response.content,
                sources: response.sources,
                createdAt: new Date(),
            };

            set((state) => ({
                sessions: state.sessions.map((s) =>
                    s.id === currentSessionId
                        ? {
                              ...s,
                              messages: [...s.messages, assistantMessage],
                              updatedAt: new Date(),
                          }
                        : s
                ),
                isLoading: false,
            }));
        }, 1500);
    },

    getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId) || null;
    },
}));
