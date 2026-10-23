# Devpost Submission Pack // OrbitOps DevPulse
**Amazon Developer Hackathon 2026**

---

## 📋 Quick Submission Metadata

- **Project Title:** OrbitOps DevPulse
- **Elevator Pitch / Tagline:** An ambient, voice-first engineering copilot that transforms natural speech from an Amazon Echo into real-time microservice scaffolding, code patching, and CloudWatch telemetry streaming across a 3-pane Fire TV Mission Control HUD.
- **Tracks Entered:** 
  - **Alexa+** (Agent Skill & Model Context Protocol Streamable HTTP Server)
  - **Fire TV** (Real-time 10-foot Ambient Mission Control HUD)
- **Mini Challenges Entered:**
  - **AWS Builder:** Autonomous agent reasoning via AWS Bedrock Mantle (`openai.gpt-oss-120b`) and AWS CloudWatch Logs integration.
  - **Open Source:** Full MIT License with open Model Context Protocol (MCP) server compliance.
- **GitHub Repository:** [https://github.com/sohail-kustagi/DevPulse_backend.git](https://github.com/sohail-kustagi/DevPulse_backend.git)
- **Was this project created before the hackathon?**  
  **No.** DevPulse was conceived, designed, and built 100% from scratch during the hackathon submission window.

---

## 📝 1. Project Description (Devpost Text Submission)

### Inspiration
Modern software engineering requires developers to constantly context-switch between terminals, documentation, architecture diagrams, cloud monitoring consoles, and code editors. When diagnosing a production incident or brainstorming a new microservice architecture, developers often have hands on coffee cups, whiteboards, or secondary screens—yet our engineering tools remain stubbornly keyboard-bound.

We asked ourselves: **What if engineering was ambient?** What if an architect could pace around their office, speak to an Amazon Echo Dot, and watch an intelligent copilot discover past code, draft OpenAPI specs, scaffold working FastAPI services, and stream verified test diffs onto their Fire TV screen? That vision became **OrbitOps DevPulse**.

### What It Does
OrbitOps DevPulse is an ambient voice engineering copilot that connects **Amazon Alexa+** to a visual **3-Pane Fire TV Mission Control HUD**:

1. **Cross-Project Discovery & Scaffolding:** Speak *"Alexa, tell DevPulse to borrow the HMAC auth module from voice-gateway and scaffold stripe-relay."* DevPulse scans past repositories, drafts `SYSTEM_DESIGN.md`, scaffolds the workspace, and runs live Pytest suites.
2. **Ambient Cloud Telemetry:** Speak *"Alexa, check cloud deployments."* DevPulse polls AWS CloudWatch and Heroku dynos, streaming real-time CPU, memory, and error rates to the HUD.
3. **Voice-Driven Error Triage & Code Patching:** Speak *"Alexa, fix the error in verify.py."* DevPulse identifies the stack trace, applies a unified search-replace diff patch, and runs tests until 100% green.
4. **Dual Feedback Loop:** Alexa speaks back a concise, natural summary suitable for voice, while the Fire TV HUD streams rich architectural artifacts, terminal logs, and live code diffs.

### How We Built It
- **Voice Ingestion:** Built using the **Alexa Skills Kit (ASK SDK v2)** with custom intent slots (`AMAZON.SearchQuery`) and continuous conversational reprompts (`shouldEndSession: false`).
- **Autonomous AI Orchestration:** Powered by **AWS Bedrock Mantle** executing the `openai.gpt-oss-120b` model. Bedrock Mantle autonomously plans tool calls, observes intermediate outputs, and produces concise voice summaries.
- **Model Context Protocol (MCP):** Implemented an open **MCP Server** (spec 2025-11-25) exposing 7 native engineering tools over Streamable HTTP (`/mcp`).
- **Real-time Event Hub:** Engineered an asynchronous WebSocket telemetry broker with dual endpoint compatibility (`/ws/telemetry` & `/ws/hud`) broadcasting JSON-RPC events.
- **Fire TV Mission Control HUD:** Built a reactive 3-pane dashboard in React with TailwindCSS, displaying workspace state, live agent reasoning chains, and interactive diff/artifact viewers.
- **Resilient Fallback Engine:** Features a `Promise.race()` 6.5s timeout guard and a deterministic heuristic agent pipeline to guarantee zero dropped sessions during live presentations.

### Challenges We Ran Into
- **Alexa's 8.0-Second Hard Cutoff:** Multi-step agent workflows (scanning repos + scaffolding + running tests) can exceed 7 seconds. We designed a 6.5s safety race that responds affirmatively to Alexa before the timeout while letting the background promise continue streaming live artifacts to the HUD.
- **Alexa NLU Carrier Phrases:** Alexa strictly rejects standalone `{query}` slots for phrase types. We engineered a comprehensive carrier dictionary (`borrow {query}`, `scaffold {query}`, `fix {query}`) to enable natural developer phrasing.
- **Continuous Multi-Turn Listening:** Alexa sessions automatically close without explicit reprompts. We enforced dynamic reprompt injections on all responses to maintain an open developer dialogue.

### Accomplishments That We're Proud Of
- **100% Passing Automated Tests:** 16 test suites with 47 automated tests covering the entire pipeline (`vitest run`).
- **Real AWS Bedrock Mantle Integration:** Live autonomous reasoning over the `openai.gpt-oss-120b` model on Amazon Bedrock.
- **Zero-Failure Demo Engine:** Seamless fallback pipeline that keeps the HUD and voice synthesis 100% operational even in offline or degraded network environments.
- **One-Command Local Boot:** A unified bash launcher (`./start_devpulse.sh`) that provisions Cloudflare HTTPS tunnels, boots backend and frontend, and verifies all health checks in under 5 seconds.

### What We Learned
- The Model Context Protocol (MCP) provides an extraordinary standardized interface for connecting LLMs to local developer tools.
- Voice-first developer tools require a distinct interaction paradigm: voice is great for intent and high-level summaries, but visual screens (like Fire TV) are indispensable for dense code diffs and architectural diagrams.

### What's Next for OrbitOps DevPulse
- Expanding the MCP tool registry to include Terraform and AWS CDK infrastructure-as-code scaffolding.
- Native Fire TV Vega OS integration with Alexa Voice Remote directional navigation.
- Multi-developer collaborative HUD sessions for live remote incident war rooms.

---

## 👥 2. GitHub Repository Sharing Instructions

The repository is open source with an **MIT License**, but if submitted as private, here is the collaborator list:

**Repository URL:** `https://github.com/sohail-kustagi/DevPulse_backend.git`

### Collaborators to Add (Settings > Collaborators > Add people):
1. `knmeiss` (Kourtney Meiss)
2. `giolaq` (Giovanni Laquidara)
3. `anishamalde` (Anisha Malde)
4. `mosesroth` (Moses Roth)
5. `emersonsklar` (Emerson Sklar)
6. `testing@devpost.com` (Devpost Testing Team)

---

## 🔍 3. Track Technology Verification (For Judges)

| Track Requirement | Where It Exists in Code | Verification Detail |
|---|---|---|
| **Alexa+ Agent Skill** | `src/alexa/webhook.ts` | Integrates `ask-sdk-core` & `ask-sdk-express-adapter`. Implements `LaunchRequestHandler`, `DevPulseIntentHandler`, and `HelpIntentHandler`. |
| **Model Context Protocol (MCP)** | `src/mcp/server.ts` & `src/mcp/toolRegistry.ts` | Implements MCP spec (2025-11-25) via `@modelcontextprotocol/sdk`. Exposes `/mcp` Streamable HTTP endpoint with 7 registered engineering tools. |
| **AWS Bedrock Mantle** | `src/agent/mantleClient.ts` & `src/agent/orchestrator.ts` | Connects to `https://bedrock-mantle.us-east-1.api.aws/v1` executing `openai.gpt-oss-120b` with autonomous tool calling. |
| **AWS CloudWatch** | `src/mcp/tools/cloudMonitor.ts` | Calls `@aws-sdk/client-cloudwatch-logs` to query log groups and platform health. |
| **Fire TV Ambient HUD** | `devpluse-Frontend/` | React 19 + TailwindCSS 10-foot ambient dashboard connected via `/ws/telemetry` & `/ws/hud`. |

---

## 💬 4. Product Feedback on Tools & SDKs Used

### A. AWS Bedrock Mantle (`openai.gpt-oss-120b`)
- **Used For:** Autonomous agent planning, multi-turn tool calling, code generation, and voice summary synthesis.
- **What Worked Well:** The OpenAI-compatible API interface made integration remarkably fast. Model latency for standard turns is impressive (~1.2s to first token), and function-calling JSON precision was reliable.
- **What Needs Work:** When executing multi-turn tool calling, the model occasionally looped on identical tool calls (`scan_past_projects`) unless explicitly restrained via prompt rules. Standard loop-prevention heuristics in the Mantle gateway would be valuable.
- **Onboarding Experience:** Clean and straightforward with standard Bearer tokens.
- **Would You Build With It Again?** Absolutely. Bedrock Mantle provides enterprise-grade throughput with open-weights model flexibility.

### B. Alexa Skills Kit (ASK SDK v2)
- **Used For:** Voice ingestion from Amazon Echo Dot, NLU intent resolution, and SSML speech synthesis.
- **What Worked Well:** Express adapter (`ask-sdk-express-adapter`) made hooking up an HTTPS webhook fast and developer-friendly. SSML speech builder is flexible.
- **What Needs Work:** The strict 8.0-second connection timeout is challenging for multi-step agent tool chains. Allowing chunked streaming audio or asynchronous progress updates would elevate Alexa into a world-class agent runtime.
- **Onboarding Experience:** Smooth in the ASK Developer Console, though carrier phrase rules on `AMAZON.SearchQuery` need clearer in-editor hints.
- **Would You Build With It Again?** Yes, especially with Alexa+ and ambient hardware.

### C. Model Context Protocol (MCP SDK `@modelcontextprotocol/sdk`)
- **Used For:** Standardized tool definitions, schema validation via Zod, and Streamable HTTP endpoint exposure.
- **What Worked Well:** Clean, vendor-neutral abstraction for developer tooling. Adding new tools required under 20 lines of schema definition.
- **What Needs Work:** CommonJS/ESM interop documentation with modern Node.js and Express could be improved.
- **Would You Build With It Again?** 100%. MCP is the future of agent tool integration.

---

## ⚡ 5. Friction Log Entries (10% Judging Bonus)

*(Extracted from `FRICTION_LOG.md`)*

1. **Alexa NLU AMAZON.SearchQuery Rejection:** Standalone `{query}` rejected by compiler. Solved via comprehensive carrier phrase schema (`borrow {query}`, `scaffold {query}`).
2. **Session Dropping on Missing Reprompt:** Alexa closed skills instantly after single turns. Resolved by forcing `.reprompt(...)` on all handler returns.
3. **8.0s Cutoff vs. Agent Latency:** Addressed via a 6.5s `Promise.race()` safety guard paired with background WebSocket streaming to the HUD.
4. **Localtunnel 408 Dropouts:** Replaced unstable `localtunnel` with a permanent, zero-config `cloudflared` Quick Tunnel.
5. **Mantle Multi-Turn Loop Repetition:** Mitigated via explicit operational prompt rules and backend tool-call deduplication.
6. **Express Middleware Body Parser Conflict with MCP SSE:** Ordered Streamable HTTP handlers before global `express.json()` parsers.
7. **AST Path Resolution for Relative Paths:** Added resilient fallback stubs in the MCP inspector tool to handle voice-abbreviated file references.

---

## 💡 6. Feature Requests (Ranked by Urgency)

1. **[CRITICAL] Alexa Agent Streaming Response Mode:** Support chunked audio streaming or intermediate "thinking" voice earcons so agents executing complex workflows (10–15s) don't trigger socket timeouts.
2. **[IMPORTANT] Unconstrained Agent Intent Slot:** Introduce an `AMAZON.AgentCatchAll` slot type that captures freeform voice sentences without requiring artificial carrier prefix phrases.
3. **[NICE-TO-HAVE] Native Fire TV Alexa Overlay Bridge:** A direct bidirectional bridge between Alexa skill sessions on Echo and Fire TV screen cards without requiring external WebSockets.

---

## 🎬 7. Three-Minute Demo Video Script & Storyboard

**Target Length:** 2 minutes 45 seconds (Strictly under 3:00 limit)  
**Setup:** Split screen or camera showing Amazon Echo Dot / Alexa Simulator on the left and Fire TV HUD (`http://localhost:5173`) on the right.

| Timestamp | Visual | Audio / Voiceover |
|---|---|---|
| **0:00 – 0:25** | Quick pan of developer desk: Echo Dot + Fire TV screen. Zoom into DevPulse HUD. | *"Welcome to OrbitOps DevPulse, the ambient, voice-first engineering copilot built for the Amazon Developer Hackathon 2026. Instead of typing in an IDE, DevPulse lets engineers design, scaffold, inspect, and monitor microservices using natural voice on Alexa and a real-time Fire TV HUD."* |
| **0:25 – 1:10** | Developer says: *"Alexa, open DevPulse."* Alexa greets. Developer says: *"Borrow the auth module from voice-gateway and scaffold stripe-relay."* | **Alexa speaks:** *"DevPulse ambient engineering copilot is active."*<br>On screen: HUD center pane immediately flashes with voice transcript, then shows Bedrock Mantle reasoning: `scan_past_projects` → `generate_project_spec` → `scaffold_workspace`. The right pane renders `SYSTEM_DESIGN.md` and FastAPI scaffolding live!<br>**Alexa speaks:** *"I've scaffolded stripe-relay with a FastAPI template, borrowing the auth middleware from voice-gateway. All 12 tests pass."* |
| **1:10 – 1:55** | Developer says: *"Check cloud deployments."* | HUD left and right panes switch to telemetry mode. CloudWatch logs and Heroku metrics graph in real time.<br>**Alexa speaks:** *"All cloud deployments are healthy. AWS ECS shows 14% CPU, 42% memory, and zero 5xx errors."* |
| **1:55 – 2:30** | Developer says: *"Inspect and fix the error in verify.py."* | HUD center pane highlights diagnostic traceback. Tool `triage_and_patch_error` applies unified diff patch replacing query params with headers. Pytest turns green.<br>**Alexa speaks:** *"I've patched the header lookup in verify.py. The live code diff is on your screen, and all 12 pytest assertions are now green."* |
| **2:30 – 2:45** | Architecture slide displaying ASK SDK, AWS Bedrock Mantle (`openai.gpt-oss-120b`), MCP Server, and Fire TV HUD. | *"DevPulse combines the natural convenience of Alexa voice, the reasoning power of AWS Bedrock Mantle, and open Model Context Protocol tooling. All code is MIT licensed on GitHub. Thank you!"* |
