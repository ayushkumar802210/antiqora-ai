/**
 * Antiqora AI Client API Layer
 * Strongly typed HTTP client with exponential backoff retries, timeouts, and sanitized errors.
 */

import {
  AIMessage,
  Conversation,
  MemoryItem,
  AppSettings,
  SystemStatus,
  ResearchResult,
} from '../types';

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

async function requestWithRetry<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 25000, retries = 2, ...fetchOptions } = options;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const message = errorJson.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        const isRetryable = response.status >= 500 || response.status === 429;

        if (isRetryable && attempt < retries) {
          attempt++;
          const backoff = Math.min(1000 * Math.pow(2, attempt), 4000);
          await new Promise((res) => setTimeout(res, backoff));
          continue;
        }

        throw new Error(message);
      }

      const json = await response.json();
      return json;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as Error)?.name === 'AbortError';
      const errMsg = isAbort ? `Request timed out after ${timeoutMs}ms` : (err as Error)?.message || 'Network failure';
      lastError = new Error(errMsg);

      if (attempt < retries && !isAbort) {
        attempt++;
        const backoff = Math.min(1000 * Math.pow(2, attempt), 4000);
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Request failed');
}

export const api = {
  // AI Chat & Tool orchestration
  async sendChatMessage(payload: {
    message: string;
    conversationId?: string;
    clientConfirmedTool?: {
      toolId: string;
      arguments: Record<string, unknown>;
    } | null;
  }): Promise<{
    success: boolean;
    message: AIMessage;
    conversationId: string;
    requiresConfirmation?: boolean;
    confirmationRequest?: AIMessage['pendingConfirmation'];
  }> {
    return await requestWithRetry('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 35000,
      retries: 1,
    });
  },

  // AI Vision
  async sendVisionMessage(payload: {
    imageBase64: string;
    mimeType?: string;
    prompt?: string;
  }): Promise<{ success: boolean; data: { content: string } }> {
    return await requestWithRetry('/api/ai/vision', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 40000,
    });
  },

  // Live Web Research
  async performResearch(query: string): Promise<{ success: boolean; data: ResearchResult }> {
    return await requestWithRetry('/api/research', {
      method: 'POST',
      body: JSON.stringify({ query }),
      timeoutMs: 20000,
    });
  },

  // System Status
  async getSystemStatus(): Promise<{ success: boolean; data: SystemStatus }> {
    return await requestWithRetry('/api/system/status', {
      method: 'GET',
      timeoutMs: 6000,
      retries: 0,
    });
  },

  // Conversations
  async getConversations(): Promise<{ success: boolean; data: Conversation[] }> {
    return await requestWithRetry('/api/conversations', { method: 'GET' });
  },

  async getConversation(id: string): Promise<{ success: boolean; data: Conversation }> {
    return await requestWithRetry(`/api/conversations/${encodeURIComponent(id)}`, { method: 'GET' });
  },

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    return await requestWithRetry(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // Memory
  async getMemories(): Promise<{ success: boolean; data: MemoryItem[] }> {
    return await requestWithRetry('/api/memory', { method: 'GET' });
  },

  async addMemory(item: { key: string; value: string; category?: string }): Promise<{ success: boolean; data: MemoryItem }> {
    return await requestWithRetry('/api/memory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async deleteMemory(id: string): Promise<{ success: boolean }> {
    return await requestWithRetry(`/api/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // Settings
  async getSettings(): Promise<{ success: boolean; data: AppSettings }> {
    return await requestWithRetry('/api/settings', { method: 'GET' });
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; data: AppSettings }> {
    return await requestWithRetry('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // Diagnostics & Audits
  async getDiagnostics(): Promise<{
    success: boolean;
    data: {
      logs: Array<{ id: string; timestamp: number; level: string; category: string; message: string }>;
      toolAudits: Array<{ id: string; timestamp: number; toolId: string; success: boolean }>;
    };
  }> {
    return await requestWithRetry('/api/system/logs', { method: 'GET' });
  },

  // File Upload & Analyze
  async uploadAndAnalyzeFile(file: File): Promise<{
    success: boolean;
    data: {
      metadata: { fileName: string; sizeBytes: number; extension: string };
      content: string;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/files/analyze', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `File upload failed with HTTP ${res.status}`);
    }
    return await res.json();
  },
};
