/**
 * ANTIQORA AI — Autonomous Desktop AI Assistant
 * Main Application Orchestrator & State Machine
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CoreState,
  AIMessage,
  Conversation,
  SystemStatus,
  MemoryItem,
  ActiveTask,
  Tool,
  PermissionRequest,
  AppSettings,
} from './types';
import { AICore } from './components/AICore';
import { Header } from './components/Header';
import { ConversationArea } from './components/ConversationArea';
import { InputBar } from './components/InputBar';
import { RightSidebar } from './components/RightSidebar';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SettingsModal } from './components/SettingsModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { api } from './services/api';
import { voiceEngine } from './services/voice';
import { desktopBridge, isDesktopApp } from './services/desktopBridge';

export const App: React.FC = () => {
  // State Machine
  const [coreState, setCoreState] = useState<CoreState>('IDLE');
  const [activeAgentName, setActiveAgentName] = useState<string>('GeneralAssistant');
  const [isScreenSharingActive, setIsScreenSharingActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Modals
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [recentActions, setRecentActions] = useState<
    Array<{ id: string; toolId: string; timestamp: number; success: boolean }>
  >([]);
  const [toolsList, setToolsList] = useState<Tool[]>([]);
  const [logsList, setLogsList] = useState<
    Array<{ id: string; timestamp: number; level: string; category: string; message: string }>
  >([]);

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    aiProvider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openAiApiKey: '',
    openAiModel: 'gpt-4o-mini',
    searchProvider: 'duckduckgo',
    searchApiKey: '',
    ttsEnabled: true,
    ttsVoice: '',
    ttsRate: 1.0,
    autoSpeakResponse: false,
    autoConfirmLevel0: true,
    autoConfirmLevel1: false,
    desktopBridgeEnabled: true,
    developerDiagnostics: false,
  });

  // 1. Initial Load & Telemetry Polling
  const loadSystemStatus = useCallback(async () => {
    try {
      const res = await api.getSystemStatus();
      if (res && res.data) {
        setSystemStatus(res.data);
      }
    } catch {
      // Degraded / offline mode handled gracefully
    }
  }, []);

  const loadMemories = useCallback(async () => {
    try {
      const res = await api.getMemories();
      if (res && res.data) {
        setMemories(res.data);
      }
    } catch {
      // graceful fallback
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.getConversations();
      if (res && res.data) {
        setConversations(res.data);
      }
    } catch {
      // fallback
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      if (res && res.data) {
        setSettings(res.data);
      }
    } catch {
      // fallback
    }
  }, []);

  const loadDiagnostics = useCallback(async () => {
    try {
      const res = await api.getDiagnostics();
      if (res && res.data) {
        setLogsList(res.data.logs || []);
        setRecentActions(res.data.toolAudits || []);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadSystemStatus();
    loadMemories();
    loadConversations();
    loadSettings();
    loadDiagnostics();

    // Load available tools
    fetch('/api/tools')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setToolsList(d.data);
      })
      .catch(() => {});

    // Poll system status every 8 seconds
    const interval = setInterval(() => {
      loadSystemStatus();
    }, 8000);

    return () => clearInterval(interval);
  }, [loadSystemStatus, loadMemories, loadSettings, loadDiagnostics]);

  // 2. Chat Processing
  const handleSendMessage = async (text: string, clientConfirmedTool?: any) => {
    if (!text.trim() && !clientConfirmedTool) return;

    const userMessage: AIMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCoreState('THINKING');

    try {
      // Check if tools might run
      if (
        text.toLowerCase().includes('search') ||
        text.toLowerCase().includes('open') ||
        text.toLowerCase().includes('read')
      ) {
        setCoreState('PROCESSING');
      }

      const response = await api.sendChatMessage({
        message: text,
        conversationId: currentConversationId || undefined,
        clientConfirmedTool,
      });

      if (response.conversationId) {
        setCurrentConversationId(response.conversationId);
      }

      // Check if permission confirmation is needed
      if (response.requiresConfirmation && response.confirmationRequest) {
        setPendingPermission(response.confirmationRequest);
        setCoreState('IDLE');
        setMessages((prev) => [...prev, response.message]);
        return;
      }

      if (response.message) {
        setMessages((prev) => [...prev, response.message]);
        if (response.message.agent) {
          setActiveAgentName(response.message.agent);
        }

        // Voice output if enabled
        if (settings.autoSpeakResponse && !isMuted) {
          voiceEngine.speak(response.message.content, { rate: settings.ttsRate });
        }
      }

      setCoreState('IDLE');
      loadMemories();
      loadDiagnostics();
    } catch (err: unknown) {
      setCoreState('ERROR');
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      const assistantError: AIMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Operation Failed**\n\n${errorMsg}`,
        timestamp: Date.now(),
        error: errorMsg,
        coreState: 'ERROR',
      };
      setMessages((prev) => [...prev, assistantError]);
      setTimeout(() => setCoreState('IDLE'), 3500);
    }
  };

  // 3. Permission Confirmation Handling
  const handleConfirmPermission = async (req: PermissionRequest) => {
    setPendingPermission(null);
    setCoreState('EXECUTING');

    await handleSendMessage(
      `Authorized action for ${req.toolId}`,
      {
        toolId: req.toolId,
        arguments: req.details,
      }
    );
  };

  const handleCancelPermission = (req: PermissionRequest) => {
    setPendingPermission(null);
    const cancelMsg: AIMessage = {
      id: `msg-c-${Date.now()}`,
      role: 'assistant',
      content: `Action \`${req.toolId}\` was cancelled by user.`,
      timestamp: Date.now(),
      coreState: 'IDLE',
    };
    setMessages((prev) => [...prev, cancelMsg]);
    setCoreState('IDLE');
  };

  // 4. Voice Input Handling
  const handleVoiceToggle = () => {
    if (isListening) {
      voiceEngine.stopListening();
      setIsListening(false);
      setCoreState('IDLE');
    } else {
      setCoreState('LISTENING');
      setIsListening(true);
      voiceEngine.startListening({
        onTranscript: (transcript, isFinal) => {
          if (isFinal && transcript) {
            setIsListening(false);
            handleSendMessage(transcript);
          }
        },
        onError: (err) => {
          setIsListening(false);
          setCoreState('ERROR');
          const errorMsg: AIMessage = {
            id: `msg-voice-err-${Date.now()}`,
            role: 'assistant',
            content: `🎤 **Voice Input Notice:** ${err}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setTimeout(() => setCoreState('IDLE'), 3000);
        },
        onEnd: () => {
          setIsListening(false);
          setCoreState((curr) => (curr === 'LISTENING' ? 'IDLE' : curr));
        },
      });
    }
  };

  // 5. Screen Capture Vision Handling
  const handleCaptureScreen = async () => {
    setIsScreenSharingActive(true);
    setCoreState('PROCESSING');

    try {
      const captureResult = await desktopBridge.captureScreen();
      if (!captureResult.success || !captureResult.dataUrl) {
        throw new Error(captureResult.error || 'Screen capture permission was not granted.');
      }

      setCoreState('THINKING');
      const visionResult = await api.sendVisionMessage({
        imageBase64: captureResult.dataUrl,
        prompt: 'Analyze this screen capture: describe the active program, window title, content, and any visible status or errors.',
      });

      const visionMsg: AIMessage = {
        id: `vision-${Date.now()}`,
        role: 'assistant',
        content: `### 🖥️ Screen Vision Analysis\n\n${visionResult.data.content}`,
        timestamp: Date.now(),
        agent: 'ScreenVisionAgent',
        coreState: 'IDLE',
      };

      setMessages((prev) => [...prev, visionMsg]);
      setCoreState('IDLE');
    } catch (err: unknown) {
      setCoreState('ERROR');
      const errorMsg = err instanceof Error ? err.message : 'Screen capture failed.';
      const failureMsg: AIMessage = {
        id: `vis-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Screen Vision Notice:** ${errorMsg}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, failureMsg]);
      setTimeout(() => setCoreState('IDLE'), 3000);
    } finally {
      setIsScreenSharingActive(false);
    }
  };

  // 6. File Upload Handling
  const handleUploadFile = async (file: File) => {
    setCoreState('PROCESSING');
    try {
      const uploadRes = await api.uploadAndAnalyzeFile(file);
      const fileMsg: AIMessage = {
        id: `file-${Date.now()}`,
        role: 'assistant',
        content: `### 📄 Document Analysis: ${uploadRes.data.metadata.fileName}\n\n**Extracted Content:**\n\`\`\`\n${uploadRes.data.content}\n\`\`\``,
        timestamp: Date.now(),
        agent: 'FileAgent',
        coreState: 'IDLE',
      };
      setMessages((prev) => [...prev, fileMsg]);
      setCoreState('IDLE');
    } catch (err: unknown) {
      setCoreState('ERROR');
      const msg = err instanceof Error ? err.message : 'File parsing failed.';
      setMessages((prev) => [
        ...prev,
        {
          id: `file-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **File Processing Failed:** ${msg}`,
          timestamp: Date.now(),
        },
      ]);
      setTimeout(() => setCoreState('IDLE'), 3000);
    }
  };

  // 7. Memory Operations
  const handleAddMemory = async (key: string, value: string, category: string) => {
    try {
      await api.addMemory({ key, value, category });
      loadMemories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await api.deleteMemory(id);
      loadMemories();
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Settings Updates
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = await api.updateSettings(newSettings);
      setSettings(updated.data);
      voiceEngine.setMuted(!updated.data.ttsEnabled);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    setMessages(conv.messages || []);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      loadConversations();
      if (currentConversationId === id) {
        setMessages([]);
        setCurrentConversationId(`conv-${Date.now()}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-antiqora-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Header */}
      <Header
        coreState={coreState}
        isMuted={isMuted}
        onToggleMute={() => {
          setIsMuted(!isMuted);
          voiceEngine.setMuted(!isMuted);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onNewChat={() => {
          setMessages([]);
          setCurrentConversationId(`conv-${Date.now()}`);
        }}
        isScreenSharingActive={isScreenSharingActive}
        onStopScreenSharing={() => setIsScreenSharingActive(false)}
        activeAgentName={activeAgentName}
        isElectron={isDesktopApp()}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* 2. Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left / Center Canvas */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Subtle Background Glow Accent */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full filter blur-3xl pointer-events-none" />

          {/* AI Core Hero (condensed if active conversation, centered if idle/empty) */}
          <div className="py-4 flex justify-center shrink-0 border-b border-slate-900/40">
            <AICore state={coreState} size={messages.length === 0 ? 'md' : 'sm'} />
          </div>

          {/* Conversation Stream */}
          <ConversationArea
            messages={messages}
            onConfirmPermission={handleConfirmPermission}
            onCancelPermission={handleCancelPermission}
            onSelectPrompt={(prompt) => handleSendMessage(prompt)}
          />

          {/* Bottom Dock Input Bar */}
          <InputBar
            onSendMessage={handleSendMessage}
            onVoiceToggle={handleVoiceToggle}
            isListening={isListening}
            onCaptureScreen={handleCaptureScreen}
            onUploadFile={handleUploadFile}
            isLoading={coreState === 'THINKING' || coreState === 'PROCESSING' || coreState === 'EXECUTING'}
            isScreenSharingActive={isScreenSharingActive}
          />
        </main>

        {/* Right Intelligence Sidebar */}
        <RightSidebar
          systemStatus={systemStatus}
          memories={memories}
          activeTasks={activeTasks}
          recentActions={recentActions}
          tools={toolsList}
          onRefreshStatus={loadSystemStatus}
          onAddMemory={handleAddMemory}
          onDeleteMemory={handleDeleteMemory}
          onCancelTask={(id) => {
            setActiveTasks((prev) => prev.filter((t) => t.id !== id));
          }}
          isOpen={isRightSidebarOpen}
          onToggleOpen={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        />
      </div>

      {/* Security Permission Modal */}
      <ConfirmationModal
        request={pendingPermission}
        onConfirm={() => {
          if (pendingPermission) handleConfirmPermission(pendingPermission);
        }}
        onCancel={() => {
          if (pendingPermission) handleCancelPermission(pendingPermission);
        }}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Developer Diagnostics Modal */}
      {isDiagnosticsOpen && (
        <DiagnosticsModal
          logs={logsList}
          toolAudits={recentActions}
          onRefresh={loadDiagnostics}
          onClose={() => setIsDiagnosticsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
