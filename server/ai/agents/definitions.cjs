/**
 * Antiqora AI Modular Agent System
 * 7 Specialized Agents with capabilities, allowed tools, and timeouts
 */

const agents = [
  {
    id: 'general_assistant',
    name: 'GeneralAssistantAgent',
    description: 'Autonomous companion for reasoning, conversation, questions, and task orchestration.',
    capabilities: ['reasoning', 'dialogue', 'explanation', 'orchestration', 'general_qa'],
    allowedTools: ['web_search', 'read_file', 'system_information', 'open_url'],
    permissionLevel: 0,
    timeoutMs: 30000,
    systemPrompt: `You are ANTIQORA AI — "Your Intelligent Digital Companion".
You are precise, insightful, and helpful. Always provide accurate facts and indicate when information is from the live web versus established knowledge. Never fabricate executions or sources.`,
  },

  {
    id: 'web_researcher',
    name: 'WebResearchAgent',
    description: 'Deep web investigator for current affairs, documentation, benchmarks, and multi-source synthesis.',
    capabilities: ['live_search', 'source_validation', 'multi_source_synthesis', 'fact_checking'],
    allowedTools: ['web_search', 'open_url'],
    permissionLevel: 0,
    timeoutMs: 35000,
    systemPrompt: `You are the WebResearchAgent of ANTIQORA AI.
Your specialty is finding up-to-date facts, cross-referencing sources, and extracting clear answers from live search data. Always list relevant sources and distinguish known from uncertain information.`,
  },

  {
    id: 'file_agent',
    name: 'FileAgent',
    description: 'Document and file specialist for PDF, DOCX, XLSX, CSV, and code analysis.',
    capabilities: ['document_parsing', 'summarization', 'data_extraction', 'safe_file_ops'],
    allowedTools: ['read_file', 'search_files', 'summarize_file', 'create_file', 'move_file', 'copy_file', 'rename_file'],
    permissionLevel: 1,
    timeoutMs: 30000,
    systemPrompt: `You are the FileAgent of ANTIQORA AI.
You excel at reading, parsing, comparing, and summarizing documents (PDF, DOCX, Excel spreadsheets, code). You respect strict file safety and never overwrite files without confirmation.`,
  },

  {
    id: 'coding_agent',
    name: 'CodingAgent',
    description: 'Software engineering agent for architecture, debugging, code generation, and refactoring.',
    capabilities: ['code_generation', 'code_review', 'debugging', 'syntax_analysis', 'file_inspection'],
    allowedTools: ['read_file', 'search_files', 'create_file'],
    permissionLevel: 1,
    timeoutMs: 35000,
    systemPrompt: `You are the CodingAgent of ANTIQORA AI.
You produce clean, idiomatic, and secure code. You follow best practices, avoid security vulnerabilities, and provide structured explanations of code changes.`,
  },

  {
    id: 'screen_vision',
    name: 'ScreenVisionAgent',
    description: 'Visual perception agent for inspecting screenshots, UI layouts, diagrams, and screen errors.',
    capabilities: ['screenshot_analysis', 'ui_inspection', 'error_ocr', 'visual_debugging'],
    allowedTools: ['capture_screen', 'analyze_image'],
    permissionLevel: 1,
    timeoutMs: 30000,
    systemPrompt: `You are the ScreenVisionAgent of ANTIQORA AI.
You analyze images and screen captures to diagnose errors, describe UI elements, and guide user workflows. Screen access is strictly user-consented.`,
  },

  {
    id: 'system_agent',
    name: 'SystemAgent',
    description: 'Desktop OS specialist for hardware metrics, safe app launching, and folder browsing.',
    capabilities: ['system_diagnostics', 'app_launcher', 'folder_navigation', 'hardware_metrics'],
    allowedTools: ['system_information', 'open_application', 'open_folder'],
    permissionLevel: 1,
    timeoutMs: 20000,
    systemPrompt: `You are the SystemAgent of ANTIQORA AI.
You monitor system performance and safely open approved desktop tools and folders. You never attempt arbitrary or destructive shell executions.`,
  },

  {
    id: 'productivity_agent',
    name: 'ProductivityAgent',
    description: 'Executive assistant for task planning, memory retention, schedules, and workflows.',
    capabilities: ['task_breakdown', 'preference_tracking', 'summary_creation', 'workflow_planning'],
    allowedTools: ['system_information', 'web_search'],
    permissionLevel: 0,
    timeoutMs: 25000,
    systemPrompt: `You are the ProductivityAgent of ANTIQORA AI.
You help organize complex user requests into structured, actionable tasks, summarize past context, and recall preferences.`,
  },
];

class AgentManager {
  constructor() {
    this.agentsMap = new Map();
    agents.forEach((a) => this.agentsMap.set(a.id, a));
  }

  getAgent(id) {
    return this.agentsMap.get(id) || this.agentsMap.get('general_assistant');
  }

  getAllAgents() {
    return Array.from(this.agentsMap.values());
  }

  selectAgentByIntent(intentText = '') {
    const text = String(intentText).toLowerCase();

    if (text.includes('screen') || text.includes('screenshot') || text.includes('what is on my display') || text.includes('look at this image')) {
      return this.getAgent('screen_vision');
    }
    if (text.includes('code') || text.includes('function') || text.includes('debug') || text.includes('typescript') || text.includes('javascript') || text.includes('python')) {
      return this.getAgent('coding_agent');
    }
    if (text.includes('pdf') || text.includes('docx') || text.includes('excel') || text.includes('spreadsheet') || text.includes('file') || text.includes('summarize file')) {
      return this.getAgent('file_agent');
    }
    if (text.includes('search') || text.includes('latest') || text.includes('current news') || text.includes('who is') || text.includes('what is today') || text.includes('price of') || text.includes('weather')) {
      return this.getAgent('web_researcher');
    }
    if (text.includes('open notepad') || text.includes('open calc') || text.includes('open app') || text.includes('system info') || text.includes('cpu') || text.includes('ram') || text.includes('open folder')) {
      return this.getAgent('system_agent');
    }
    if (text.includes('todo') || text.includes('plan') || text.includes('schedule') || text.includes('organize') || text.includes('remember')) {
      return this.getAgent('productivity_agent');
    }

    return this.getAgent('general_assistant');
  }
}

const agentManager = new AgentManager();
module.exports = {
  agentManager,
  agents,
};
