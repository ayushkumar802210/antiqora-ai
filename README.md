# ANTIQORA AI — Autonomous Desktop AI Assistant
**Tagline:** *"Your Intelligent Digital Companion"*  
**Version:** 1.0 Production-Ready Foundation

---

## 1. Requirements

- **Operating System:** Windows 10/11, macOS 12+, or modern Linux (Ubuntu 22.04+).
- **Node.js:** v18.0.0 or higher (v20+ / v24+ recommended).
- **Package Manager:** `npm` (v9+), `pnpm`, or `yarn`.
- **Display Resolution:** 1280x720 minimum (optimally 1920x1080 or higher).
- **Microphone:** Optional, required for voice interaction.
- **Display Server:** Standard desktop display for screen capture vision capabilities.

---

## 2. Installation

Clone or open the repository directory:

```bash
cd "antiqora ai"
```

Install production and development dependencies:

```bash
npm install
```

Copy the environment configuration template:

```bash
cp .env.example .env
```

---

## 3. Environment Variables

Configure `.env` as needed. Antiqora AI safely falls back to local and privacy-respecting modes if keys are omitted.

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local engine server port | `3001` |
| `NODE_ENV` | Environment (`development` \| `production`) | `development` |
| `AI_PROVIDER` | Active AI provider (`gemini` \| `openai` \| `local`) | `gemini` |
| `AI_API_KEY` | Google Gemini API key (or `GEMINI_API_KEY`) | `""` |
| `AI_MODEL` | Gemini model variant | `gemini-2.5-flash` |
| `OPENAI_API_KEY` | OpenAI API key | `""` |
| `OPENAI_MODEL` | OpenAI model variant | `gpt-4o-mini` |
| `SEARCH_PROVIDER` | Web search provider (`duckduckgo` \| `tavily`) | `duckduckgo` |
| `SEARCH_API_KEY` | Optional Tavily or search engine API key | `""` |
| `TTS_PROVIDER` | Speech synthesis provider (`browser` \| `system`) | `browser` |
| `STORAGE_PATH` | Persistent JSON storage location | `./data/antiqora_store.json` |

---

## 4. Development

Run the full Antiqora AI stack (Express Engine + Vite Hot Module Reloading):

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

To run only the background API engine:
```bash
npm run dev:server
```

To run only the Vite UI:
```bash
npm run dev:ui
```

---

## 5. Production Build

Verify strict TypeScript compilation and compile optimized frontend production bundles:

```bash
npm run typecheck
npm run build
```

Production artifacts are output to `dist/`.

To start the production server:
```bash
npm start
```

---

## 6. Desktop Build (Electron)

Launch the native Windows/macOS/Linux Electron desktop application with hardware acceleration and native desktop bridge:

```bash
npm run electron:dev
```

In desktop mode:
- Native screenshot capture runs via Electron's `desktopCapturer`.
- OS app launchers (`notepad`, `calc`, `mspaint`, `explorer`, `code`) spawn via detached system processes without shell interpolation.
- Context isolation is strictly enforced (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).

---

## 7. AI Provider Configuration

Antiqora AI features a **provider-independent AI orchestration layer** (`/server/ai/providers`):

1. **Google Gemini (`GeminiProvider`):**
   - High-speed multimodal intelligence (Gemini 2.5 Flash / Gemini Pro).
   - Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Enter your key in **Settings (⚙️)** or set `AI_API_KEY=AIza...` in `.env`.
2. **OpenAI (`OpenAIProvider`):**
   - GPT-4o, GPT-4o-mini support with vision.
   - Enter your key in **Settings (⚙️)** or set `OPENAI_API_KEY=sk-...` in `.env`.
3. **Local / Offline Fallback (`LocalProvider`):**
   - Zero-cloud operation mode.
   - Executes real local tools (hardware stats, system info, local file inspection, allowlisted application launchers) without external API access.
   - Never fabricates AI answers when keys are missing.

---

## 8. Web Research Configuration

- **Real DuckDuckGo Live Search:** Antiqora includes a built-in search parser that extracts authentic web links, snippets, and page titles without requiring any paid API key.
- **Tavily Search API:** Optionally set `SEARCH_PROVIDER=tavily` and provide `SEARCH_API_KEY` in `.env` for deep multi-source research tasks.
- **Source Attribution:** Every web research query returns real source cards with clickable links in the conversation stream.

---

## 9. Voice Configuration

- **Speech-to-Text (STT):** Integrates Web Speech Recognition API with automatic 12-second silence timeout and microphone permission guards.
- **Text-to-Speech (TTS):** Browser SpeechSynthesis with pitch, rate slider (0.7x - 1.5x), and mute controls.
- **Safety Audio Filter:** Automatically redacts API keys (`AIza...`, `sk-...`), bearer tokens, and code blocks before speaking to prevent accidental audio disclosure.

---

## 10. Permission System

Antiqora AI implements a strict **4-tier security sandbox**:

- **Level 0 (Read-Only):**
  - Read files (`read_file`, `summarize_file`), inspect system specs (`system_information`), web search (`web_search`).
  - Auto-allowed by default.
- **Level 1 (Safe Reversible):**
  - Open approved apps (`open_application`), open folder (`open_folder`), open URL (`open_url`), create new non-conflicting files (`create_file`).
- **Level 2 (File & System Modification):**
  - Moving files (`move_file`), renaming files (`rename_file`), copying files (`copy_file`).
  - **Always requires explicit user confirmation via the Security Authorization Modal.**
- **Level 3 (Destructive / Sensitive Actions):**
  - Overwriting existing files, deleting items, executing privileged system commands.
  - **Always prompts: "ANTIQORA AI wants to: [exact action] — Allow / Cancel".**

---

## 11. Security Architecture

1. **Zero Key Leakage:** API credentials are held exclusively in server memory or desktop configuration; never shipped in client JS bundles.
2. **Path Traversal Protection:** Every file path is validated via `sanitizePath` to prevent `../` escapes, root overwrites, and null-byte injection (`\0`).
3. **No Unrestricted Shells:** System execution uses strict binary allowlists (`notepad.exe`, `calc.exe`, `explorer.exe`, etc.) and `spawn` with array arguments — arbitrary shell commands like `rm -rf` are strictly blocked.
4. **Resilient Persistence:** Storage operations in `./data/antiqora_store.json` feature atomic writes with fallbacks designed for Windows and OneDrive file locking.

---

## 12. Troubleshooting

- **"AI Provider Not Configured":** Click the **Settings (⚙️)** gear icon in the top header and paste your Gemini or OpenAI API key, or add `AI_API_KEY=...` to `.env`.
- **Microphone permission error:** Ensure browser or OS settings grant microphone access to localhost/Electron.
- **Screen capture shows blank:** Click "Allow" on the system display selection prompt when triggering screen vision.
- **Port 3001 already in use:** Set `PORT=3002` in `.env`.

---

## 13. Testing

Antiqora AI comes with a comprehensive Vitest test suite covering unit tests, security sanitizers, tool schemas, voice filters, and 8 complete end-to-end workflows:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript type check
npm run typecheck
```

### Verified E2E Workflows:
- **TEST 1:** User asks standard question $\rightarrow$ AI answers.
- **TEST 2:** Current event query $\rightarrow$ live web search with verified sources.
- **TEST 3:** Open URL $\rightarrow$ URL validation and safe browser launch.
- **TEST 4:** Read file $\rightarrow$ safe parsing of local files.
- **TEST 5:** Sensitive action $\rightarrow$ explicit confirmation gate before execution.
- **TEST 6:** AI failure $\rightarrow$ graceful error reporting with zero fabricated responses.
- **TEST 7:** Microphone denied $\rightarrow$ friendly error notification without crashing.
- **TEST 8:** Screen vision denied $\rightarrow$ friendly notification without crashing.
