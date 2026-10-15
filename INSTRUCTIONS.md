# OrbitOps Backend — Developer Instructions

> **Project Codename:** DevPulse Backend  
> **Role:** Node.js + TypeScript runtime powering the Alexa voice agent, Bedrock Mantle AI orchestrator, 7 MCP developer tools, and real-time WebSocket HUD feed.  
> **Repository:** `https://github.com/sohail-kustagi/Orbitsops_backend.git`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Directory Structure](#4-directory-structure)
5. [WebSocket Protocol Contract](#5-websocket-protocol-contract)
6. [REST API Endpoints](#6-rest-api-endpoints)
7. [MCP Tool Specifications](#7-mcp-tool-specifications)
8. [Bedrock Mantle Orchestrator](#8-bedrock-mantle-orchestrator)
9. [Alexa Skills Kit Integration](#9-alexa-skills-kit-integration)
10. [Frontend Integration Guide](#10-frontend-integration-guide)
11. [Environment Variables](#11-environment-variables)
12. [Development Workflow](#12-development-workflow)
13. [Related Documents](#13-related-documents)

---

## 1. Project Overview

OrbitOps is a voice-driven agentic developer copilot for the **Amazon Developer Hackathon 2026**. The system lets a developer speak commands to an **Echo Dot**, which routes through this backend to:

1. Parse voice intent via **Alexa Skills Kit (ASK)**
2. Orchestrate multi-step tool chains via **Amazon Bedrock Mantle** (`openai.gpt-oss-120b`)
3. Execute 7 local **MCP (Model Context Protocol)** developer tools (scaffold, inspect, patch, push, etc.)
4. Stream real-time telemetry to the **OrbitOps Frontend HUD** via WebSocket

The frontend (already built in a separate repo) is a 3D Mission Control HUD built with React 19, TanStack Start, Three.js, and Framer Motion. It connects to this backend at `ws://localhost:8000/ws/telemetry`.

---

## 2. Tech Stack & Dependencies

| Category | Package | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | ≥ 20 LTS | ES Modules, async/await |
| **Language** | TypeScript | ^5.5 | Strict type safety |
| **HTTP Server** | Express | ^4.19 | REST endpoints + Alexa webhook |
| **WebSocket** | ws | ^8.18 | Real-time HUD feed |
| **Alexa SDK** | ask-sdk-core + ask-sdk-express-adapter | ^2.14 | Voice intent handling |
| **AI Model** | openai (Official SDK) | ^4.68 | Bedrock Mantle tool calling |
| **MCP** | @modelcontextprotocol/sdk | ^1.0 | MCP HTTP/SSE server |
| **Schema** | zod | ^3.23 | Tool input validation |
| **Git** | simple-git | ^3.25 | Local git operations |
| **Shell** | execa | ^9.0 | Child process execution |
| **GitHub** | @octokit/rest | ^21.0 | Repo provisioning + issues |
| **AWS** | @aws-sdk/client-cloudwatch-logs | ^3.600 | CloudWatch log queries |
| **Dev Runner** | tsx | ^4.16 | TypeScript execution in dev |
| **Test** | vitest | ^2.0 | Unit + integration tests |
| **Lint** | eslint + prettier | latest | Code quality |

---

## 3. Architecture Diagram

```
[Echo Dot] ──(Voice)──▶ [Alexa Voice Service (AVS)]
                              │
                              │ HTTPS POST (Cloudflare Tunnel / ngrok)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ORBITOPS BACKEND  (Express + WS on Port 8000)                      │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ POST /api/alexa  │  │ Bedrock Mantle   │  │ MCP Server         │  │
│  │ (ASK Adapter)    │─▶│ Orchestrator     │─▶│ /mcp (HTTP/SSE)    │  │
│  │ 6.5s timeout     │  │ openai.gpt-oss   │  │ 7 Tools (Zod)      │  │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ GET /health      │  │ HUD EventBus     │  │ WS /ws/telemetry   │  │
│  │ GET /api/status  │  │ (EventEmitter)   │─▶│ JSON event stream  │  │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                         │            │
│                                                         ▼            │
│                                              ┌──────────────────┐   │
│                                              │ Frontend HUD     │   │
│                                              │ (ws://...:8000)  │   │
│                                              └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Directory Structure

```
orbitops-backend/
├── package.json
├── tsconfig.json
├── .env.example
├── vitest.config.ts
├── INSTRUCTIONS.md                 # (This file)
├── IMPLEMENTATION_PLAN.md          # Phased build plan
├── AWS_SETUP.md                    # AWS service configuration guide
├── FRICTION_LOG.md                 # Hackathon friction observations
└── src/
    ├── index.ts                    # Express app + WS server bootstrap
    ├── config.ts                   # Env validation (Zod)
    │
    ├── alexa/
    │   ├── webhook.ts              # ASK handlers + 6.5s Promise.race
    │   ├── ssml.ts                 # SSML sanitizer for code symbols
    │   └── __tests__/
    │       ├── webhook.test.ts
    │       └── ssml.test.ts
    │
    ├── agent/
    │   ├── mantleClient.ts         # OpenAI SDK → Bedrock Mantle endpoint
    │   ├── systemPrompt.ts         # Voice-first system prompt
    │   ├── orchestrator.ts         # Multi-turn tool execution loop
    │   └── __tests__/
    │       ├── mantleClient.test.ts
    │       └── orchestrator.test.ts
    │
    ├── mcp/
    │   ├── server.ts               # @modelcontextprotocol/sdk server
    │   ├── toolRegistry.ts         # Zod → MCP & OpenAI schema adapter
    │   ├── tools/
    │   │   ├── pastProjects.ts     # 1. scan_past_projects
    │   │   ├── specAndScaffold.ts  # 2. generate_project_spec + 3. scaffold_workspace
    │   │   ├── codeInspector.ts    # 4. inspect_file_and_audit + 5. triage_and_patch_error
    │   │   ├── githubOps.ts        # 6. provision_github_repo
    │   │   └── cloudMonitor.ts     # 7. check_cloud_deployments
    │   └── __tests__/
    │       ├── toolRegistry.test.ts
    │       ├── pastProjects.test.ts
    │       ├── specAndScaffold.test.ts
    │       ├── codeInspector.test.ts
    │       ├── githubOps.test.ts
    │       └── cloudMonitor.test.ts
    │
    ├── hud/
    │   ├── eventBus.ts             # Typed EventEmitter → WS broadcast
    │   └── __tests__/
    │       └── eventBus.test.ts
    │
    ├── routes/
    │   ├── health.ts               # GET /health
    │   ├── status.ts               # GET /api/status
    │   └── __tests__/
    │       └── routes.test.ts
    │
    └── __tests__/
        ├── integration/
        │   ├── wsConnection.test.ts
        │   ├── alexaWebhook.test.ts
        │   └── mcpEndpoint.test.ts
        └── e2e/
            └── fullPipeline.test.ts
```

---

## 5. WebSocket Protocol Contract

### Connection

```
URL: ws://localhost:8000/ws/telemetry
```

The frontend's `useAgentStream` hook connects to this endpoint. On failure, it retries with exponential backoff and falls back to a built-in demo loop after 2 failed attempts.

### Event Envelope Schema

Every WebSocket message is a JSON object with this shape:

```typescript
interface AgentEvent {
  id?: string;          // Optional, frontend generates if missing
  timestamp?: string;   // ISO 8601, frontend uses Date.now() if missing
  type: "VOICE_INPUT" | "TOOL_CALL" | "ARTIFACT_UPDATE" | "THOUGHT";
  payload: Record<string, unknown>;
}
```

### Event Types & Required Payloads

#### `VOICE_INPUT`
Sent when Alexa transcribes a voice command.

```json
{
  "type": "VOICE_INPUT",
  "payload": {
    "text": "Scaffold a FastAPI service for doorbell events."
  }
}
```

**Frontend behavior:** Shows pulsing microphone icon + audio equalizer + voice text in header bar. Clears after 3.5s.

#### `THOUGHT`
Sent when Bedrock Mantle is reasoning / planning.

```json
{
  "type": "THOUGHT",
  "payload": {
    "model": "bedrock/openai.gpt-oss-120b",
    "text": "Intent: new service. Plan → scaffold, write spec, add tests, run pytest."
  }
}
```

**Frontend behavior:** Renders italic reasoning text with Brain icon in Activity Stream.

#### `TOOL_CALL`
Sent when an MCP tool is invoked.

```json
{
  "type": "TOOL_CALL",
  "payload": {
    "tool": "scaffold_workspace",
    "args": { "name": "ring-events", "template": "fastapi" },
    "latency": 1.8
  }
}
```

Special: When `tool === "git_commit"`, the frontend updates branch state:
```json
{
  "type": "TOOL_CALL",
  "payload": {
    "tool": "git_commit",
    "args": { "branch": "feat/ring-events", "message": "feat: ingest endpoint" }
  }
}
```

**Frontend behavior:** Shows Terminal icon + tool name + args JSON in Activity Stream. Triple-ping animation.

#### `ARTIFACT_UPDATE`
Sent when a spec, diff, or terminal output is generated.

```json
{
  "type": "ARTIFACT_UPDATE",
  "payload": {
    "kind": "spec" | "diff" | "terminal",
    "content": "<markdown or diff or terminal output>",
    "tests": [14, 14]  // Optional: [passed, total]
  }
}
```

- `kind: "spec"` → Updates the **SYSTEM_DESIGN.md** tab (rendered as Markdown)
- `kind: "diff"` → Updates the **DIFF** tab (rendered as unified diff with line numbers)
- `kind: "terminal"` → Updates the **TERMINAL** tab (rendered as styled terminal output)

**Frontend behavior:** Switches right pane tab to the updated artifact kind. Updates test count in telemetry panel if `tests` array is present. Sets `dirty: true` if `kind === "diff"`.

### Optional: Latency Field

Any event can include a top-level `latency` field (number, in seconds):
```json
{ "type": "...", "payload": { "latency": 1.4, ... } }
```
This updates the sparkline jitter chart in the TelemetryPanel.

---

## 6. REST API Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/alexa` | Alexa webhook (ASK SDK Express Adapter) | Amazon signature verification |
| `GET` | `/health` | Health check (`{ status: "ok" }`) | None |
| `GET` | `/api/status` | System status (uptime, connected clients, etc.) | None |
| `POST/GET` | `/mcp` | MCP Streamable HTTP / SSE endpoint | None (local only) |
| `WS` | `/ws/telemetry` | Real-time HUD event stream | None (local only) |

### Detailed Endpoint Specs

#### `POST /api/alexa`

Receives Alexa intent JSON, runs through ASK SDK handlers, orchestrates Bedrock Mantle agent turn with 6.5s `Promise.race()` timeout, and returns SSML response.

**Request:** Alexa Request Envelope (JSON)  
**Response:** Alexa Response Envelope (JSON)

#### `GET /health`

```json
{ "status": "ok", "uptime": 12345, "version": "1.0.0" }
```

#### `GET /api/status`

```json
{
  "wsClients": 2,
  "mcpToolsRegistered": 7,
  "mantleConnected": true,
  "activeWorkspace": "~/projects/ring-events",
  "lastEventTimestamp": "2026-10-15T12:15:00Z"
}
```

---

## 7. MCP Tool Specifications

Each tool is defined once using Zod, dual-registered for both MCP protocol and Bedrock Mantle OpenAI function calling.

### Tool 1: `scan_past_projects`
- **File:** `src/mcp/tools/pastProjects.ts`
- **Input:** `{ basePath?: string }` (defaults to `~/projects`)
- **Output:** Array of project summaries with reusable modules
- **Node APIs:** `fs/promises`, `path`

### Tool 2: `generate_project_spec`
- **File:** `src/mcp/tools/specAndScaffold.ts`
- **Input:** `{ name: string, description: string, components: string[] }`
- **Output:** Writes `SYSTEM_DESIGN.md` + `IMPLEMENTATION_PLAN.md`
- **HUD Event:** Emits `artifact.updated` with `kind: "spec"`

### Tool 3: `scaffold_workspace`
- **File:** `src/mcp/tools/specAndScaffold.ts`
- **Input:** `{ name: string, template: "fastapi" | "express" | "nextjs", borrowFrom?: string[] }`
- **Output:** Created directory tree, copied modules, wrote source + tests
- **HUD Event:** Emits `TOOL_CALL` + `ARTIFACT_UPDATE`

### Tool 4: `inspect_file_and_audit`
- **File:** `src/mcp/tools/codeInspector.ts`
- **Input:** `{ filePath: string, startLine?: number, endLine?: number, lint?: boolean }`
- **Output:** File contents with line numbers, optional lint results
- **Node APIs:** `fs.readFile`, `execa` (eslint/ruff)

### Tool 5: `triage_and_patch_error`
- **File:** `src/mcp/tools/codeInspector.ts`
- **Input:** `{ mode: "diagnose" | "patch", filePath: string, searchReplace?: { search: string, replace: string } }`
- **Output (diagnose):** Stack trace + surrounding code
- **Output (patch):** Applied diff + re-ran tests
- **HUD Event:** Emits `ARTIFACT_UPDATE` with `kind: "diff"` and `kind: "terminal"`

### Tool 6: `provision_github_repo`
- **File:** `src/mcp/tools/githubOps.ts`
- **Input:** `{ name: string, private?: boolean, localPath: string }`
- **Output:** Created repo, wrote CI workflow, committed + pushed
- **Dependencies:** `@octokit/rest`, `simple-git`

### Tool 7: `check_cloud_deployments`
- **File:** `src/mcp/tools/cloudMonitor.ts`
- **Input:** `{ provider: "aws" | "heroku", resource: string, lookbackMinutes?: number }`
- **Output:** Aggregated error counts, recent log events, status
- **Dependencies:** `@aws-sdk/client-cloudwatch-logs`, `fetch` (Heroku API)

---

## 8. Bedrock Mantle Orchestrator

The orchestrator runs a multi-turn tool calling loop using the OpenAI SDK pointed at Amazon Bedrock Mantle:

```
Endpoint: https://bedrock-mantle.{AWS_REGION}.api.aws/v1
Model:    openai.gpt-oss-120b
```

**Key behaviors:**
- System prompt is voice-optimized (concise spoken responses)
- Executes tool chains: model decides which tools to call, backend executes them, returns results
- Each tool call emits events to the HUD EventBus
- Returns a concise `spokenSummary` for Alexa TTS

---

## 9. Alexa Skills Kit Integration

- Uses `ask-sdk-express-adapter` to mount at `POST /api/alexa`
- Validates Amazon request signatures
- Manages `sessionAttributes` across turns (active repo, last error, pending job)
- **Critical:** 6.5s `Promise.race()` timeout guard (Alexa drops at 8s)
- Background promises continue executing and stream to HUD after timeout

---

## 10. Frontend Integration Guide

The frontend is **already built** and expects exactly the WebSocket protocol defined in Section 5. Your backend must:

1. **Start a WebSocket server** on `ws://localhost:8000/ws/telemetry`
2. **Broadcast JSON events** matching the `AgentEvent` type
3. **Include the `latency` field** in `TOOL_CALL` payloads to drive the sparkline chart
4. **Use correct `kind` values** in `ARTIFACT_UPDATE` payloads (`spec`, `diff`, `terminal`)
5. **Emit `git_commit` tool calls** with `branch` in args to update the telemetry panel

The frontend auto-falls back to a demo loop if the WebSocket is unreachable.

---

## 11. Environment Variables

Create a `.env` file from `.env.example`:

```env
# AWS Bedrock Mantle
BEDROCK_MANTLE_API_KEY=your_bedrock_api_key
AWS_REGION=us-east-1

# GitHub
GITHUB_TOKEN=ghp_your_personal_access_token

# AWS CloudWatch (optional, uses default credential chain)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Heroku (optional)
HEROKU_API_TOKEN=your_heroku_token

# Local Workspace
WORKSPACE_DIR=~/projects

# Server
PORT=8000
NODE_ENV=development
```

---

## 12. Development Workflow

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

---

## 13. Related Documents

| Document | Purpose |
|---|---|
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phased build plan with tests per phase |
| [AWS_SETUP.md](./AWS_SETUP.md) | AWS Bedrock, CloudWatch, IAM setup guide |
| [FRICTION_LOG.md](./FRICTION_LOG.md) | Hackathon friction observations (10% bonus) |
| [Frontend Overview](../devpulse_frontend_fire_tv_hud_overview.md) | Frontend HUD architecture spec |
| [Backend Overview](../devpulse_backend_bedrock_mantle_mcp_overview.md) | Original backend architecture spec |
