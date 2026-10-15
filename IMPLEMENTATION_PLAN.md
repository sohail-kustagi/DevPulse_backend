# OrbitOps Backend — Implementation Plan

> **Target:** Complete backend in **5 phases** with tests and validation gates at each phase.  
> **Estimated Total Time:** 4–5 days (solo developer, full-time)

---

## Phase Overview

| Phase | Name | Duration | Deliverables |
|---|---|---|---|
| **Phase 1** | Foundation & HUD Pipeline | Day 1 | Express server, WebSocket, EventBus, health routes |
| **Phase 2** | MCP Tool Registry & Core Tools | Day 2 | Tool registry, tools 1–3 (scan, spec, scaffold) |
| **Phase 3** | Inspection & Patching Tools | Day 2–3 | Tools 4–5 (inspect, triage/patch), tool 6 (GitHub) |
| **Phase 4** | Bedrock Mantle Orchestrator | Day 3–4 | AI client, system prompt, multi-turn loop, tool 7 |
| **Phase 5** | Alexa Integration & E2E | Day 4–5 | ASK webhook, SSML sanitizer, e2e pipeline test |

---

## Phase 1: Foundation & HUD Pipeline

### Goal
Set up the Express + WebSocket server skeleton and prove the real-time HUD feed works end-to-end with the frontend.

### Tasks

#### 1.1 — Project Initialization
```bash
mkdir orbitops-backend && cd orbitops-backend
npm init -y
# Install core dependencies
npm install express ws zod dotenv
npm install -D typescript tsx @types/express @types/ws @types/node vitest
```

- [ ] Create `tsconfig.json` with `"module": "ESNext"`, `"target": "ES2022"`, `"moduleResolution": "bundler"`, strict mode
- [ ] Create `package.json` scripts: `dev`, `build`, `start`, `test`, `test:watch`, `lint`
- [ ] Create `.env.example` with all required variables
- [ ] Create `.gitignore` (node_modules, dist, .env, *.log)

#### 1.2 — Config Module (`src/config.ts`)
- [ ] Use Zod to parse and validate environment variables
- [ ] Export typed config object
- [ ] Throw on missing required variables at startup

```typescript
// Expected exports:
export const config: {
  port: number;
  nodeEnv: string;
  bedrockMantleApiKey: string;
  awsRegion: string;
  githubToken: string;
  workspaceDir: string;
}
```

#### 1.3 — HUD Event Bus (`src/hud/eventBus.ts`)
- [ ] Create typed `EventEmitter` that broadcasts to all connected WebSocket clients
- [ ] Method: `emitEvent(type: AgentEventType, payload: Record<string, unknown>)`
- [ ] Auto-generates `id` (timestamp + counter) and `timestamp` (ISO 8601)
- [ ] Maintains a Set of connected `WebSocket` clients
- [ ] Handles client disconnect cleanup

```typescript
// Expected exports:
export const hudBus: {
  emitEvent(type: AgentEventType, payload: Record<string, unknown>): void;
  addClient(ws: WebSocket): void;
  removeClient(ws: WebSocket): void;
  clientCount: number;
}
```

#### 1.4 — Express Server + WebSocket (`src/index.ts`)
- [ ] Create Express app on `PORT` (default 8000)
- [ ] Mount WebSocket upgrade on `/ws/telemetry`
- [ ] On WS connection: add to `hudBus`, on disconnect: remove
- [ ] Enable CORS for `http://localhost:8080` (frontend dev server)
- [ ] Mount health routes

#### 1.5 — Health Routes (`src/routes/health.ts`, `src/routes/status.ts`)
- [ ] `GET /health` → `{ status: "ok", uptime: process.uptime(), version: "1.0.0" }`
- [ ] `GET /api/status` → `{ wsClients, mcpToolsRegistered, mantleConnected, activeWorkspace, lastEventTimestamp }`

### Phase 1 Tests & Validation

```
src/hud/__tests__/eventBus.test.ts
├── ✓ emitEvent broadcasts to all connected clients
├── ✓ emitEvent generates valid id and ISO timestamp
├── ✓ addClient/removeClient correctly maintains client set
├── ✓ disconnected clients are cleaned up
└── ✓ emitEvent with no clients does not throw

src/routes/__tests__/routes.test.ts
├── ✓ GET /health returns 200 with status ok
├── ✓ GET /api/status returns wsClients count
└── ✓ Unknown routes return 404

src/__tests__/integration/wsConnection.test.ts
├── ✓ WebSocket connects to /ws/telemetry
├── ✓ Receives event when hudBus.emitEvent is called
├── ✓ Receives correctly shaped AgentEvent JSON
├── ✓ Multiple clients receive same broadcast
└── ✓ Client disconnect reduces wsClients count
```

**Validation Gate:** Start the backend (`npm run dev`), start the frontend (`npm run dev` in the frontend repo), and confirm the frontend's connection status changes from `DEMO_STREAM` to `CONNECTED`. Manually call `hudBus.emitEvent("VOICE_INPUT", { text: "Hello world" })` and see it appear in the Activity Stream.

---

## Phase 2: MCP Tool Registry & Core Tools

### Goal
Build the unified tool registry (Zod schemas shared between MCP and OpenAI function calling) and implement tools 1–3.

### Tasks

#### 2.1 — Install MCP & Shell Dependencies
```bash
npm install @modelcontextprotocol/sdk simple-git execa
```

#### 2.2 — Tool Registry (`src/mcp/toolRegistry.ts`)
- [ ] Define `DevPulseTool<T>` interface (name, description, Zod schema, jsonSchema, execute fn)
- [ ] `zodToJsonSchema(schema)` — converts Zod schema to JSON Schema for OpenAI function calling
- [ ] `executeToolWithTelemetry(tool, rawArgs)` — validates args, emits `mcp.tool_start` + `mcp.tool_complete` HUD events
- [ ] `getAllTools()` — returns array of all registered tools
- [ ] `getToolByName(name)` — lookup by name

#### 2.3 — MCP Server (`src/mcp/server.ts`)
- [ ] Create `@modelcontextprotocol/sdk` `McpServer` instance
- [ ] Register all 7 tools from the registry
- [ ] Expose Streamable HTTP / SSE transport on `/mcp`
- [ ] Mount on Express app

#### 2.4 — Tool 1: `scan_past_projects` (`src/mcp/tools/pastProjects.ts`)
- [ ] Input: `{ basePath?: string }`
- [ ] Recursively scan for `package.json`, `pyproject.toml`, `README.md`
- [ ] Extract project name, description, dependencies, and reusable module paths
- [ ] Return array of `{ name, path, stack, modules: string[] }`

#### 2.5 — Tool 2: `generate_project_spec` (`src/mcp/tools/specAndScaffold.ts`)
- [ ] Input: `{ name, description, components }`
- [ ] Generate `SYSTEM_DESIGN.md` with Mermaid diagram and component descriptions
- [ ] Generate `IMPLEMENTATION_PLAN.md` with phases and tasks
- [ ] Write files to `WORKSPACE_DIR/<name>/`
- [ ] Emit `ARTIFACT_UPDATE` with `kind: "spec"` and full Markdown content

#### 2.6 — Tool 3: `scaffold_workspace` (`src/mcp/tools/specAndScaffold.ts`)
- [ ] Input: `{ name, template, borrowFrom? }`
- [ ] Create directory structure based on template (fastapi, express, nextjs)
- [ ] Copy reusable modules from `borrowFrom` paths if specified
- [ ] Write boilerplate source files + test files
- [ ] Run test runner (`pytest` or `npm test`) and capture output
- [ ] Emit `ARTIFACT_UPDATE` with `kind: "terminal"` containing test output

### Phase 2 Tests & Validation

```
src/mcp/__tests__/toolRegistry.test.ts
├── ✓ zodToJsonSchema produces valid JSON Schema
├── ✓ executeToolWithTelemetry validates args against Zod schema
├── ✓ executeToolWithTelemetry emits mcp.tool_start event
├── ✓ executeToolWithTelemetry emits mcp.tool_complete with duration_ms
├── ✓ executeToolWithTelemetry emits error status on tool failure
├── ✓ getAllTools returns all registered tools
└── ✓ getToolByName returns correct tool

src/mcp/__tests__/pastProjects.test.ts
├── ✓ Scans directory and finds package.json projects
├── ✓ Extracts project name and dependencies
├── ✓ Returns empty array for empty directory
├── ✓ Handles permission errors gracefully
└── ✓ Identifies reusable modules (middleware, utils)

src/mcp/__tests__/specAndScaffold.test.ts
├── ✓ generate_project_spec creates SYSTEM_DESIGN.md
├── ✓ generate_project_spec creates IMPLEMENTATION_PLAN.md
├── ✓ generate_project_spec emits ARTIFACT_UPDATE event
├── ✓ scaffold_workspace creates correct directory tree for fastapi template
├── ✓ scaffold_workspace creates correct directory tree for express template
├── ✓ scaffold_workspace copies borrowed modules
├── ✓ scaffold_workspace runs test runner and captures output
└── ✓ scaffold_workspace emits ARTIFACT_UPDATE with terminal output

src/__tests__/integration/mcpEndpoint.test.ts
├── ✓ MCP server responds to tool list request
├── ✓ MCP server executes scan_past_projects tool
└── ✓ MCP server returns error for invalid tool args
```

**Validation Gate:** Use an MCP client (or `curl`) to call each tool through `/mcp`. Verify HUD events appear in the frontend Activity Stream.

---

## Phase 3: Inspection, Patching & GitHub Tools

### Goal
Build the code inspection/patching tools and GitHub repo provisioning.

### Tasks

#### 3.1 — Install GitHub SDK
```bash
npm install @octokit/rest
```

#### 3.2 — Tool 4: `inspect_file_and_audit` (`src/mcp/tools/codeInspector.ts`)
- [ ] Input: `{ filePath, startLine?, endLine?, lint? }`
- [ ] Read file, prefix each line with line number (`1: import ...`)
- [ ] If `startLine`/`endLine` specified, slice the range
- [ ] If `lint: true`, run `npx eslint` (JS/TS) or `ruff check` (Python) via `execa`
- [ ] Return `{ content: string, lineCount: number, lintIssues?: LintIssue[] }`

#### 3.3 — Tool 5: `triage_and_patch_error` (`src/mcp/tools/codeInspector.ts`)
- [ ] **diagnose mode:** Read `.devpulse_error.log` or run test command, capture stack trace, read surrounding code lines
- [ ] **patch mode:** Apply search-and-replace to target file, generate unified diff with `simple-git`, re-run test suite
- [ ] Emit `ARTIFACT_UPDATE` with `kind: "diff"` (patch content) and `kind: "terminal"` (test results)

#### 3.4 — Tool 6: `provision_github_repo` (`src/mcp/tools/githubOps.ts`)
- [ ] Input: `{ name, private?, localPath }`
- [ ] Create repo via `octokit.repos.createForAuthenticatedUser()`
- [ ] Write `.github/workflows/ci.yml` for automated testing
- [ ] `git init` + `git add .` + `git commit` + `git remote add origin` + `git push`
- [ ] Emit `TOOL_CALL` with `tool: "git_commit"` and `args.branch: "main"`
- [ ] Return `{ repoUrl, commitSha, ciWorkflowUrl }`

### Phase 3 Tests & Validation

```
src/mcp/__tests__/codeInspector.test.ts
├── ✓ inspect_file reads file with line numbers
├── ✓ inspect_file slices correct line range
├── ✓ inspect_file runs eslint when lint=true
├── ✓ inspect_file handles non-existent file gracefully
├── ✓ triage_and_patch diagnose mode captures stack trace
├── ✓ triage_and_patch patch mode applies search-replace
├── ✓ triage_and_patch patch mode generates unified diff
├── ✓ triage_and_patch patch mode re-runs tests
├── ✓ triage_and_patch emits diff ARTIFACT_UPDATE
└── ✓ triage_and_patch emits terminal ARTIFACT_UPDATE

src/mcp/__tests__/githubOps.test.ts
├── ✓ provision_github_repo creates repo via Octokit (mocked)
├── ✓ provision_github_repo writes CI workflow file
├── ✓ provision_github_repo initializes git and pushes
├── ✓ provision_github_repo emits git_commit TOOL_CALL
├── ✓ provision_github_repo handles existing repo error
└── ✓ provision_github_repo returns repo URL and commit SHA
```

**Validation Gate:** 
1. Create a test file, call `inspect_file_and_audit` — verify line-numbered output appears
2. Introduce a deliberate bug, call `triage_and_patch_error` in diagnose mode, then patch mode — verify diff appears in frontend DIFF tab
3. Call `provision_github_repo` with a test name — verify repo is created on GitHub with CI workflow

---

## Phase 4: Bedrock Mantle Orchestrator & Cloud Monitor

### Goal
Connect to Amazon Bedrock Mantle and build the multi-turn tool execution loop.

### Tasks

#### 4.1 — Install AWS SDK
```bash
npm install openai @aws-sdk/client-cloudwatch-logs
```

#### 4.2 — Mantle Client (`src/agent/mantleClient.ts`)
- [ ] Initialize `openai` SDK with Bedrock Mantle base URL and API key
- [ ] Export `mantleClient` and `MODEL_ID` constant
- [ ] Add connection health check method

#### 4.3 — System Prompt (`src/agent/systemPrompt.ts`)
- [ ] Voice-first prompt: instruct model to give concise spoken responses
- [ ] Include tool descriptions and usage guidance
- [ ] Include workspace context (active project, recent errors)

#### 4.4 — Orchestrator (`src/agent/orchestrator.ts`)
- [ ] `runAgentTurn(query: string, sessionAttrs: SessionState): Promise<AgentResult>`
- [ ] Build messages array with system prompt + user query
- [ ] Loop: call `mantleClient.chat.completions.create()` with tools
- [ ] On tool calls: execute via `executeToolWithTelemetry()`, append results, continue loop
- [ ] On text response: return `{ spokenSummary, fullResponse }`
- [ ] Emit `THOUGHT` events for each reasoning step
- [ ] Max iterations: 10 (safety limit)

#### 4.5 — Tool 7: `check_cloud_deployments` (`src/mcp/tools/cloudMonitor.ts`)
- [ ] **AWS path:** Use `FilterLogEventsCommand` to query CloudWatch logs
- [ ] **Heroku path:** Use `fetch` to query `/apps/{app}/dynos` and `/apps/{app}/log-sessions`
- [ ] Aggregate error counts: `ERROR`, `CRITICAL`, `5xx`, `H10`
- [ ] Return spoken digest: "AWS ECS has 3 errors in the last 10 minutes..."

### Phase 4 Tests & Validation

```
src/agent/__tests__/mantleClient.test.ts
├── ✓ mantleClient initializes with correct baseURL
├── ✓ mantleClient uses correct model ID
└── ✓ mantleClient health check succeeds (mocked)

src/agent/__tests__/orchestrator.test.ts
├── ✓ runAgentTurn returns spokenSummary for simple query
├── ✓ runAgentTurn executes single tool call
├── ✓ runAgentTurn executes multi-step tool chain
├── ✓ runAgentTurn emits THOUGHT events
├── ✓ runAgentTurn emits TOOL_CALL events per tool invocation
├── ✓ runAgentTurn respects 10-iteration safety limit
├── ✓ runAgentTurn handles tool execution errors gracefully
└── ✓ runAgentTurn returns concise voice-friendly response

src/mcp/__tests__/cloudMonitor.test.ts
├── ✓ check_cloud_deployments queries AWS CloudWatch (mocked)
├── ✓ check_cloud_deployments queries Heroku API (mocked)
├── ✓ check_cloud_deployments aggregates error counts
├── ✓ check_cloud_deployments returns spoken digest
└── ✓ check_cloud_deployments handles API failures gracefully
```

**Validation Gate:** Call `runAgentTurn("What errors are in CloudWatch?", {})` programmatically and verify:
1. THOUGHT events stream to the HUD
2. The `check_cloud_deployments` tool is invoked
3. A concise spoken summary is returned

---

## Phase 5: Alexa Integration & End-to-End Pipeline

### Goal
Wire up the Alexa webhook, implement the 6.5s timeout guard, SSML sanitizer, and run the complete end-to-end pipeline.

### Tasks

#### 5.1 — Install Alexa SDK
```bash
npm install ask-sdk-core ask-sdk-express-adapter
```

#### 5.2 — SSML Sanitizer (`src/alexa/ssml.ts`)
- [ ] Strip/escape characters that break TTS: `&`, `<`, `>`, `"`, `'`
- [ ] Replace file paths with spoken-friendly form: `src/auth/jwt.ts` → "source auth JWT"
- [ ] Replace code symbols: `=>` → "arrow", `&&` → "and", `||` → "or"
- [ ] Wrap numbers/acronyms in `<say-as>` tags
- [ ] Keep output under Alexa's 8000-character SSML limit

#### 5.3 — Alexa Webhook (`src/alexa/webhook.ts`)
- [ ] Create ASK intent handlers: `DevPulseIntentHandler`, `LaunchRequestHandler`, `HelpIntentHandler`, `CancelStopHandler`, `SessionEndedHandler`, `FallbackHandler`
- [ ] `DevPulseIntentHandler`:
  - Extract spoken query from slot
  - Emit `VOICE_INPUT` to HUD
  - Run `runAgentTurn()` wrapped in `Promise.race()` with 6.5s timeout
  - On timeout: return "I'm executing that workflow in the background now..."
  - On success: return SSML-sanitized spoken summary
- [ ] Mount via `ExpressAdapter` at `POST /api/alexa`
- [ ] Manage `sessionAttributes` (activeRepo, lastError, pendingJobId)

#### 5.4 — Error Handler Registration
- [ ] Register ASK error handler to catch unexpected failures
- [ ] Log errors and return friendly spoken message

### Phase 5 Tests & Validation

```
src/alexa/__tests__/ssml.test.ts
├── ✓ Sanitizes & characters
├── ✓ Replaces file paths with spoken form
├── ✓ Replaces => with "arrow"
├── ✓ Wraps acronyms in say-as tags
├── ✓ Truncates output to 8000 chars
└── ✓ Handles empty input

src/alexa/__tests__/webhook.test.ts
├── ✓ LaunchRequestHandler returns welcome message
├── ✓ DevPulseIntentHandler extracts spoken query
├── ✓ DevPulseIntentHandler emits VOICE_INPUT event
├── ✓ DevPulseIntentHandler returns response within 6.5s
├── ✓ DevPulseIntentHandler returns timeout message for slow operations
├── ✓ Background promise continues after timeout
├── ✓ HelpIntentHandler returns help text
├── ✓ CancelStopHandler ends session
└── ✓ Error handler returns friendly message

src/__tests__/integration/alexaWebhook.test.ts
├── ✓ POST /api/alexa with valid LaunchRequest returns 200
├── ✓ POST /api/alexa with IntentRequest triggers agent
├── ✓ POST /api/alexa rejects unsigned requests
└── ✓ WebSocket clients receive events during Alexa request

src/__tests__/e2e/fullPipeline.test.ts
├── ✓ Voice command → Bedrock Mantle → MCP tool → HUD event (mocked)
├── ✓ Multi-step tool chain executes and streams to WebSocket
├── ✓ Timeout guard fires at 6.5s and background continues
├── ✓ Session attributes persist across turns
└── ✓ Full scaffold + test + GitHub push pipeline completes
```

**Validation Gate (Full Integration Test):**

1. Start backend: `npm run dev`
2. Start frontend: `cd ../OrbitOps-frontend && npm run dev`
3. Open `http://localhost:8080` — confirm `CONNECTED` status (not `DEMO_STREAM`)
4. Use ngrok/Cloudflare Tunnel: `ngrok http 8000`
5. Configure Alexa Skill webhook URL to the ngrok HTTPS URL + `/api/alexa`
6. Speak to Echo Dot: "Alexa, open DevPulse"
7. Speak: "Scaffold a FastAPI service called ring-events"
8. Verify on HUD:
   - VOICE_INPUT appears with transcription
   - THOUGHT cards appear with Bedrock reasoning
   - TOOL_CALL cards appear for scaffold_workspace
   - SYSTEM_DESIGN.md tab updates with generated spec
   - TERMINAL tab shows pytest output
   - Telemetry panel shows test count + latency sparkline
9. Speak: "Push it to GitHub"
10. Verify: repo appears on GitHub, branch updates in telemetry panel

---

## Test Execution Summary

| Phase | Unit Tests | Integration Tests | Total |
|---|---|---|---|
| Phase 1 | 8 | 5 | 13 |
| Phase 2 | 19 | 3 | 22 |
| Phase 3 | 16 | 0 | 16 |
| Phase 4 | 16 | 0 | 16 |
| Phase 5 | 15 | 9 | 24 |
| **Total** | **74** | **17** | **91** |

### Test Commands

```bash
# Run all tests
npm test

# Run specific phase tests
npx vitest run src/hud                    # Phase 1
npx vitest run src/mcp                    # Phase 2–3
npx vitest run src/agent                  # Phase 4
npx vitest run src/alexa                  # Phase 5
npx vitest run src/__tests__/integration  # Integration
npx vitest run src/__tests__/e2e          # End-to-end

# Watch mode
npm run test:watch
```
