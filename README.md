# OrbitOps DevPulse // Ambient Voice & MCP Engineering Copilot

> **Amazon Developer Hackathon 2026 Submission**  
> **Tracks:** Alexa+ Agent Skills & Fire TV Ambient Mission Control  
> **Mini Challenges:** AWS Builder (Bedrock Mantle `openai.gpt-oss-120b`, CloudWatch) & Open Source (MIT License, MCP Integration)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-2025--11--25-purple.svg)](https://modelcontextprotocol.io/)
[![AWS Bedrock](https://img.shields.io/badge/AWS%20Bedrock-Mantle-orange.svg)](https://aws.amazon.com/bedrock/)

---

## 🌟 Overview

**OrbitOps DevPulse** is a hands-free, ambient engineering copilot that bridges voice commands from an **Amazon Echo Dot / Alexa+** with a visual 3-pane **Fire TV Mission Control HUD**. 

Instead of typing in an IDE terminal, a software architect can speak naturally:
> *"Alexa, tell DevPulse to borrow the HMAC auth module from voice-gateway and scaffold stripe-relay."*

In seconds:
1. **Alexa Skill** routes the voice intent through an ultra-low latency webhook guarded by a 6.5s safety cutoff.
2. **AWS Bedrock Mantle** (`openai.gpt-oss-120b`) plans autonomous tool chains using the **Model Context Protocol (MCP)**.
3. **MCP Tools** discover code in past projects, shape `SYSTEM_DESIGN.md` architecture specifications, scaffold FastAPI microservices, and run live Pytest test suites.
4. **Real-time WebSocket Hub** streams thought steps, tool telemetry, diff patches, and live test outcomes to the **Fire TV HUD**.
5. **Alexa** speaks back a crisp, synthesized summary of the completed work.

---

## 🏗️ Architecture & Technology Stack

```
 ┌──────────────────────────────────────────────────────────────┐
 │               DEVELOPER VOICE & AMBIENT HUD                  │
 └──────────────┬───────────────────────────────▲───────────────┘
                │ Spoken Command                │ WebSocket Event Stream
                ▼                               │ (/ws/telemetry & /ws/hud)
 ┌──────────────────────────────┐     ┌─────────┴─────────────────────┐
 │ Amazon Echo Dot / Alexa+     │     │ Fire TV / Desktop HUD (Vite)  │
 │ (ASK SDK v2 Webhook)         │     │ 3-Pane Mission Control UI     │
 └──────────────┬───────────────┘     └───────────────────────────────┘
                │ HTTPS (Cloudflare Tunnel)
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                 DEVPULSE CORE BACKEND (8000)                 │
 │  - Express & Node.js 20+ ESM TypeScript                      │
 │  - Promise.race(6.5s) Alexa Timeout Guard                    │
 │  - Dual Event Telemetry Hub (Envelope Formats 1 & 2)         │
 └──────────────┬───────────────────────────────▲───────────────┘
                │ Tool Calling & Reasoning      │ MCP Streamable HTTP
                ▼                               ▼ (/mcp)
 ┌──────────────────────────────┐     ┌───────────────────────────────┐
 │ AWS Bedrock Mantle           │     │ Model Context Protocol (MCP)  │
 │ Model: openai.gpt-oss-120b   │     │ 7 Autonomous Engineering Tools│
 └──────────────────────────────┘     └───────────────────────────────┘
```

### Required Technology Verification
- **Alexa+ Agent Skill:** Full integration via `ask-sdk-core` and `ask-sdk-express-adapter` in `src/alexa/webhook.ts`.
- **Model Context Protocol (MCP):** Implements MCP spec (2025-11-25) via `@modelcontextprotocol/sdk` on endpoint `/mcp` with 7 registered engineering tools.
- **AWS Bedrock Mantle:** Uses OpenAI-compatible client connected to `https://bedrock-mantle.us-east-1.api.aws/v1` executing `openai.gpt-oss-120b`.
- **AWS CloudWatch:** Live CloudWatch log group inspection via `@aws-sdk/client-cloudwatch-logs`.

---

## 🛠️ The 7 MCP Tools

| Tool Name | Parameters | Purpose |
|---|---|---|
| `scan_past_projects` | `basePath` | Analyzes existing codebases to identify reusable modules (e.g. auth, HMAC, rate limiters). |
| `generate_project_spec` | `name`, `description`, `borrowedFrom` | Generates architectural Markdown specs (`SYSTEM_DESIGN.md`) and contract boundaries. |
| `scaffold_workspace` | `name`, `template`, `borrowFrom` | Bootstraps project trees, copies borrowed modules, and runs live Pytest tests. |
| `inspect_file_and_audit` | `filePath`, `startLine`, `endLine`, `lint` | 1-indexed file inspector with AST security linting (`eval`, `TODO`, `console.log`). |
| `triage_and_patch_error` | `mode`, `filePath`, `searchReplace`, `errorTrace` | Diagnoses runtime exceptions and applies verified unified diff search-and-replace patches. |
| `provision_github_repo` | `name`, `private` | Initializes git repositories, commits scaffolded code, and configures GitHub Actions CI/CD. |
| `check_cloud_deployments` | `provider`, `lookbackMinutes` | Queries AWS ECS CloudWatch logs and Heroku dynos for CPU, memory, and 5xx error rates. |

---

## 🚀 One-Click Local Quickstart

Run the master Mission Control script from the workspace root:

```bash
cd /home/cipher/orbitops
./start_devpulse.sh
```

This single command:
1. Cleans and reserves ports `8000` and `5173`.
2. Downloads and boots a secure Cloudflare HTTPS tunnel for Alexa webhooks.
3. Launches the DevPulse Core Backend on `http://localhost:8000`.
4. Connects to AWS Bedrock Mantle (`openai.gpt-oss-120b`).
5. Boots the React Fire TV HUD on `http://localhost:5173`.
6. Prints the public Alexa webhook URL ready to paste into the Alexa Developer Console.

---

## 🧪 Automated Test Suite

DevPulse features 100% passing automated test coverage across unit, integration, and E2E pipelines:

```bash
npm test
```

```text
✓ src/alexa/__tests__/ssml.test.ts (4 tests)
✓ src/hud/__tests__/eventBus.test.ts (6 tests)
✓ src/mcp/__tests__/toolRegistry.test.ts (4 tests)
✓ src/mcp/__tests__/pastProjects.test.ts (2 tests)
✓ src/mcp/__tests__/codeInspector.test.ts (3 tests)
✓ src/mcp/__tests__/specAndScaffold.test.ts (2 tests)
✓ src/mcp/__tests__/cloudMonitor.test.ts (1 test)
✓ src/mcp/__tests__/githubOps.test.ts (1 test)
✓ src/agent/__tests__/orchestrator.test.ts (3 tests)
✓ src/alexa/__tests__/webhook.test.ts (3 tests)
✓ src/routes/__tests__/routes.test.ts (7 tests)
✓ src/__tests__/integration/mcpEndpoint.test.ts (4 tests)
✓ src/__tests__/integration/wsConnection.test.ts (4 tests)
✓ src/__tests__/integration/alexaWebhook.test.ts (1 test)
✓ src/__tests__/e2e/fullPipeline.test.ts (1 test)

Test Files  16 passed (16)
Tests       47 passed (47)
```

---

## 📄 License & Open Source

This project is licensed under the [MIT License](LICENSE). All source code, schemas, and assets are open source and publicly accessible.
