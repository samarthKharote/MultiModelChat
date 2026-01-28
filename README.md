## MultiModelChat (MultiChatBot)

MultiModelChat lets you compare multiple Large Language Models (LLMs) side‑by‑side, tune them, and synthesize the best answer. The app is a React front‑end that talks to the Semoss platform for authentication, cataloging available engines, and running Pixel commands against configured LLM backends.

### What problems it solves
- Rapidly evaluate and compare multiple LLM engines on the same prompt.
- Capture per‑model temperature settings to balance creativity and factuality.
- Produce an aggregated “best response” that resolves contradictions across engines.
- Reduce friction with built‑in Semoss authentication and engine discovery.

### Key features
- Multi‑model selection and per‑model temperature controls.
- Parallel, non‑blocking generation across all selected engines.
- One‑click “Generate Best Response” synthesizer using an aggregator engine.
- Copy / re‑run per model; stop all generations.
- Auth flows (native + Microsoft OAuth via Semoss config).
- Built with Material UI, so the layout is responsive and readable.

### Architecture overview
- **Frontend:** React + TypeScript, Material UI, `@semoss/sdk`/`@semoss/sdk-react`.
- **Platform services (Semoss):** authentication, engine catalog (`MyEngines`), and execution of Pixel commands (`LLM(...)`) against configured LLM providers.
- **Backends for models:** whichever engines you configure in Semoss (OpenAI, HuggingFace, local, etc.). This repo does not include those services; it consumes them via the SDK.
<img width="1356" height="778" alt="ProjectOverview" src="https://github.com/user-attachments/assets/f52b2142-3631-45e7-ae91-fb793564d528" />

## Detailed Component Analysis

### Frontend: React Application and Routing
- App Initialization: Sets up the Semoss SDK environment and wraps the app with theme and router.
- Router and Protected Routes: Hash-based routing with authentication guard; redirects unauthenticated users to login.
- Main Layout: Provides a consistent footer and disclaimer across pages.
- Login Page: Supports native and OAuth login flows via the Semoss SDK.
<img width="1014" height="770" alt="AppStart" src="https://github.com/user-attachments/assets/5319cc42-bc14-4dc6-b8af-baf61ae1782c" />

### Multi-Model Chat Experience
- Model Catalog Discovery: Queries Semoss for available LLM engines and initializes selections.
- Parallel Execution: Sends identical prompts to multiple selected models concurrently with per-model temperature control.
- Real-Time Rendering: Displays loading states, individual responses, and errors per model panel.
- Best Response Synthesis: Aggregates completed responses into a single synthesis prompt and generates a consolidated answer.
<img width="1243" height="721" alt="multimodelChat" src="https://github.com/user-attachments/assets/05448f22-8f24-4280-848c-939175f2698d" />
### Authentication System
- Native and OAuth Providers: Supports native username/password and Microsoft OAuth via the Semoss SDK.
- Protected Routes: Unauthenticated users are redirected to the login page.
- Authorization State: Uses SDK-provided hooks to enforce route protection.
  <img width="1221" height="665" alt="authentication" src="https://github.com/user-attachments/assets/e40d3349-3170-4126-8444-f3408969d43a" />

### Running locally
Prerequisites: Node 18+, pnpm, access to a Semoss deployment with engines configured.

1) Install dependencies
```
cd client
pnpm install
```

2) Configure environment  
Create `client/.env` (or set env vars) with your Semoss details:
```
MODULE=<your module id>
ACCESS_KEY=<your access key>
SECRET_KEY=<your secret key>
```
These values must match an existing project in your Semoss environment.

3) Start the dev server
```
cd client
pnpm run dev
```
Visit `http://localhost:3000`


