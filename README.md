## MultiModelChat (MultiChatBot)

MultiModelChat lets you compare multiple Large Language Models (LLMs) side‑by‑side, tune them, and synthesize the best answer. The app is a React front‑end that talks to the Semoss platform for authentication, cataloging available engines, and running Pixel commands against configured LLM backends.

### Why this exists
- Teams often have several LLM providers (open‑source or hosted) but no single place to benchmark them quickly.
- Prompt and temperature tuning are tedious when done one model at a time.
- Decision makers want one “best” answer synthesized from many candidates.

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

```
flowchart TD
    U[User Browser] --> UI[React + MUI Frontend]
    UI -->|Auth + tokens| SemossAuth[@semoss/sdk → Semoss auth]
    UI -->|MyEngines()| EngineCatalog[Semoss engine catalog]
    UI -->|LLM(engine=..., command=prompt)| LLMs[Configured LLM providers]
    UI -->|LLM(engine=aggregator, command=synthesis)| Aggregator[Best-response synthesis]
    LLMs --> UI
    Aggregator --> UI
```

### Request & page flow (high level)
```
sequenceDiagram
    participant U as User
    participant FE as Frontend (React)
    participant SEM as Semoss Actions API
    participant LLM as LLM Engines

    U->>FE: Login (native or OAuth)
    FE->>SEM: actions.login(...)
    SEM-->>FE: session established

    U->>FE: Open chat, select models, set temps, enter prompt
    FE->>SEM: MyEngines(engineTypes=["MODEL"]) for catalog
    loop For each selected model
        FE->>SEM: LLM(engine=model_i, command=[prompt], paramValues=[temperature])
        SEM->>LLM: Route to provider
        LLM-->>SEM: Response
        SEM-->>FE: Model_i response
    end
    U->>FE: Click "Generate Best Response"
    FE->>SEM: LLM(engine=aggregator, command=[synthesis prompt], temperature=0)
    SEM-->>FE: Synthesized answer
```

### Frontend mechanics (key screens)
- `MultiModelChatPage`: primary experience for multi‑model chat. Loads engines via `MyEngines`, sends parallel `LLM` Pixel calls per selection, renders `ModelComparisonColumn` tiles, and can synthesize a best response.
- `ModelSelectionSidebar`: selects models and sets global/per‑model temperatures.
- `ModelComparisonColumn`: shows question, per‑model response, copy, and rerun controls.
- `LoginPage`: uses `useInsight().actions.login` for native or OAuth providers configured in Semoss.
- `ModelPage`: legacy single‑question comparison experience (kept for compatibility).

### How it works (under the hood)
1. On load, `useInsight` initializes the Semoss SDK.
2. The app calls `MyEngines(engineTypes=["MODEL"])` to list available LLM engines from your Semoss project.
3. When you send a prompt, the app issues one `LLM(engine=..., command=[prompt], paramValues=[temperature])` call per selected model in parallel.
4. Responses stream back to the UI; you can rerun any model individually.
5. “Generate Best Response” builds a synthesis prompt that contains all completed model answers and calls a chosen engine (first selected by default) to produce the consolidated reply.

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
APP=<your app id>
```
These values must match an existing project in your Semoss environment.

3) Start the dev server
```
cd client
pnpm dev
```
Visit `http://localhost:3000` (hash routing is used, so deep links remain stable).

4) Production build (optional)
```
pnpm build
```
Outputs will be in `client/dist` based on your webpack config.

### Folder structure (high level)
- `client/` – React app (pages, components, theme, assets).
- `client/src/pages/MultiModelChatPage.tsx` – main multi‑model chat experience.
- `client/src/components/ModelSelectionSidebar` – model selection & temperature controls.
- `client/src/components/ModelComparisonColumn` – per‑model response cards.
- `client/src/pages/LoginPage.tsx` – authentication UI.
- `java/`, `py/` – experimental model runners (not wired into the current UI).
- `docs/` – generated PDF copy of this documentation (see below).

### PDF copy
A PDF version of this documentation is available at `docs/MultiModelChat_Documentation.pdf`. Regenerate it anytime with:
```
python scripts/generate_pdf.py
```

### Suggested improvements / next steps
- Add persistence for conversations and model selections.
- Wire vector database retrieval (the code has placeholders for it).
- Add automated tests (unit + integration) around Pixel call flows and error states.
- Consider streaming responses for faster perceived latency.

