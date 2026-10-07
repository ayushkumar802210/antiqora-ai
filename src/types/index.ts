/**
 * ANTIQORA AI — Core Type Definitions
 * Strict TypeScript models for all agents, tools, permissions, and UI states.
 */

export type AIProviderType = 'gemini' | 'openai' | 'local';

export type CoreState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'PROCESSING'
  | 'EXECUTING'
  | 'ERROR';

export type PermissionLevel = 0 | 1 | 2 | 3;
// Level 0: Read-only info (read_file, system_information, etc.)
// Level 1: Safe reversible actions (open_application, open_folder, open_url, create_file)
// Level 2: Actions affecting files/system (move_file, copy_file, rename_file)
// Level 3: Sensitive or destructive actions (delete_file, send_message, change settings)

export interface PermissionRequest {
  id: string;
  toolId: string;
  level: PermissionLevel;
  actionDescription: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface ToolInputSchema {
  type: string;
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
  }>;
  required?: string[];
}

export interface ToolInput {
  toolId: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolId: string;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationDetails?: {
    action: string;
    level: PermissionLevel;
    payload: Record<string, unknown>;
  };
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'file' | 'system' | 'vision' | 'productivity';
  permissionLevel: PermissionLevel;
  timeoutMs: number;
  inputSchema: ToolInputSchema;
  execute: (args: Record<string, unknown>, context?: ToolExecutionContext) => Promise<ToolResult>;
}

export interface ToolExecutionContext {
  approvedPermissions?: string[];
  requestId?: string;
  signal?: AbortSignal;
}

export interface AgentResult {
  success: boolean;
  message: string;
  agentName: string;
  data?: unknown;
  toolsUsed?: string[];
  sources?: WebSource[];
  error?: string;
  requiresConfirmation?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  allowedTools: string[];
  permissionLevel: PermissionLevel;
  timeoutMs: number;
  systemPrompt: string;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  relevanceScore?: number;
}

export interface ResearchResult {
  query: string;
  summary: string;
  sources: WebSource[];
  timestamp: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  agent?: string;
  coreState?: CoreState;
  toolsUsed?: string[];
  toolResults?: ToolResult[];
  sources?: WebSource[];
  error?: string;
  pendingConfirmation?: PermissionRequest;
  isStreaming?: boolean;
  isAudio?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AIMessage[];
}

export interface ShortTermMemory {
  conversationId: string;
  recentTurns: Array<{
    role: string;
    summary: string;
    timestamp: number;
  }>;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'fact' | 'instruction' | 'context';
  createdAt: number;
  updatedAt: number;
  sourceMessageId?: string;
}

export interface LongTermMemory {
  items: MemoryItem[];
}

export interface TaskStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: number;
}

export interface ActiveTask {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  currentStep: string;
  steps: TaskStep[];
  startedAt: number;
  elapsedMs: number;
  canCancel: boolean;
}

export interface SystemStatus {
  online: boolean;
  platform: string;
  hostname: string;
  uptimeSeconds: number;
  cpu: {
    model: string;
    cores: number;
    usagePercent: number;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usagePercent: number;
  };
  desktopConnected: boolean;
  aiProvider: AIProviderType;
  aiConfigured: boolean;
  screenSharingActive: boolean;
  microphoneActive: boolean;
}

export type ErrorCode =
  | 'AI_PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'FILE_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'TOOL_FAILED'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN_ERROR';

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface AppSettings {
  aiProvider: AIProviderType;
  geminiApiKey: string;
  geminiModel: string;
  openAiApiKey: string;
  openAiModel: string;
  searchProvider: 'duckduckgo' | 'searxng' | 'tavily';
  searchApiKey: string;
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsRate: number;
  autoSpeakResponse: boolean;
  autoConfirmLevel0: boolean;
  autoConfirmLevel1: boolean;
  desktopBridgeEnabled: boolean;
  developerDiagnostics: boolean;
}

export interface DesktopBridgeAPI {
  isElectron: boolean;
  getSystemInfo: () => Promise<SystemStatus>;
  openApplication: (appNameOrPath: string) => Promise<{ success: boolean; message: string }>;
  openFolder: (folderPath: string) => Promise<{ success: boolean; message: string }>;
  openUrl: (url: string) => Promise<{ success: boolean; message: string }>;
  captureScreen: () => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  listDirectory: (dirPath: string) => Promise<{ success: boolean; files?: string[]; error?: string }>;
}

declare global {
  interface Window {
    antiqoraDesktop?: DesktopBridgeAPI;
  }
}
