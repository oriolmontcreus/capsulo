import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Message, Conversation, AIAction } from './types';
import { generateId } from '@/lib/utils/id-generation';


// StoredMessage extends the persisted Message model with conversationId for storage
export interface StoredMessage extends Message {
    conversationId: string;
}

interface AIChatDB extends DBSchema {
    conversations: {
        key: string;
        value: Conversation;
        indexes: { 'by-date': number };
    };
    messages: {
        key: string;
        value: StoredMessage;
        indexes: { 'by-conversation': string };
    };
}

const DB_NAME = 'capsulo-ai-chat';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AIChatDB>> | undefined;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<AIChatDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
                convStore.createIndex('by-date', 'updatedAt');

                const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
                msgStore.createIndex('by-conversation', 'conversationId');
            },
        });
    }
    return dbPromise;
}

export const chatStorage = {
    async createConversation(title: string = "New Chat") {
        const db = await getDB();
        const id = generateId();
        const now = Date.now();
        await db.put('conversations', {
            id,
            title,
            createdAt: now,
            updatedAt: now,
        });
        return id;
    },

    async getConversations(): Promise<Conversation[]> {
        const db = await getDB();
        return db.getAllFromIndex('conversations', 'by-date');
    },

    async deleteConversation(id: string) {
        const db = await getDB();
        const tx = db.transaction(['conversations', 'messages'], 'readwrite');
        await tx.objectStore('conversations').delete(id);
        
        // Delete all messages for this conversation
        const msgIndex = tx.objectStore('messages').index('by-conversation');
        let cursor = await msgIndex.openCursor(IDBKeyRange.only(id));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
    },

    async addMessage(conversationId: string, message: Omit<StoredMessage, 'conversationId'>) {
        const db = await getDB();
        const tx = db.transaction(['conversations', 'messages'], 'readwrite');
        
        // Update conversation timestamp
        const conv = await tx.objectStore('conversations').get(conversationId);
        if (!conv) {
            console.warn(`Conversation ${conversationId} not found, message may be orphaned`);
        }
        if (conv) {
            await tx.objectStore('conversations').put({ ...conv, updatedAt: Date.now() });
        }

        await tx.objectStore('messages').put({
            ...message,
            conversationId,
            createdAt: message.createdAt || Date.now(),
        });
        
        await tx.done;
    },

    async getMessages(conversationId: string): Promise<StoredMessage[]> {
        const db = await getDB();
        return db.getAllFromIndex('messages', 'by-conversation', conversationId);
    },

    async cleanupOldChats(maxAgeMs = 3 * 24 * 60 * 60 * 1000) { // Default 3 days
        const db = await getDB();
        const cutoff = Date.now() - maxAgeMs;
        const conversations = await db.getAll('conversations');
        
        for (const conv of conversations) {
            if (conv.updatedAt < cutoff) {
                await this.deleteConversation(conv.id);
            }
        }
    },

    async updateConversationTitle(id: string, title: string) {
        const db = await getDB();
        const conv = await db.get('conversations', id);
        if (conv) {
            await db.put('conversations', { ...conv, title, updatedAt: Date.now() });
        }
    }
};
