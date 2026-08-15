# QueryRecon

### Build complex search strategies. Research across many sources. Turn evidence into an investigation graph.

QueryRecon is a local-first OSINT workspace that combines a visual query compiler, multi-source research pipeline, AI-assisted analysis, reusable dork templates, and an investigation board in one browser application.

It is designed for researchers who need more than a text box: build a search as a structured Boolean tree, inspect how it compiles, collect evidence from independent providers, save the work automatically, and connect findings on a persistent canvas.

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Version](https://img.shields.io/badge/version-2.0.0-7c3aed)](https://github.com/GajjarKashyap/QueryRecon/releases/tag/v2.0.0)
[![Local first](https://img.shields.io/badge/storage-local--first-16a34a)](#privacy-and-security-model)

> QueryRecon was previously named GoogleDorker. The project has grown from a dork builder into a broader research and investigation workspace.

## Versions

- **V2.0.0 (current):** Advanced research mode, investigation board, multi-provider AI, DeepSeek support, MiniCPM5 and Hermes local assistants, persistent workspaces, and the upgraded interface.
- **V1.0.0 (legacy):** The original QueryRecon release remains available from the [`v1.0.0`](https://github.com/GajjarKashyap/QueryRecon/tree/v1.0.0) tag.

## Why QueryRecon?

Most query tools stop after producing a search string. QueryRecon supports the complete investigation loop:

```mermaid
flowchart LR
    A[Question or target] --> B[Visual query AST]
    B --> C[Compiled search strategy]
    C --> D[Parallel research sources]
    D --> E[Normalized evidence]
    E --> F[AI-assisted answer]
    E --> G[Investigation board]
    F --> H[Saved local workspace]
    G --> H
```

- Build deeply nested `AND`, `OR`, and `NOT` logic visually.
- Translate plain-language intent into a starting query tree.
- Assess query breadth, sensitivity, and likely result quality before searching.
- Research the same topic across academic, reference, media, document, news, and specialist sources.
- Continue receiving useful results when one public provider is unavailable or rate-limited.
- Keep investigations, findings, history, boards, and cached results in the browser.
- Use cloud AI providers, a private MiniCPM model, or a local Hermes Agent gateway.

## Feature overview

| Area | What QueryRecon provides |
| --- | --- |
| Query Builder | Visual AST editor, nested Boolean groups, live compilation, natural-language starting points, explanation, assessment, undo and redo |
| Query Intelligence | Detects broad or risky patterns, estimates query quality, and provides actionable improvement guidance |
| Research Mode | Quick, Balanced, and Deep collection modes with parallel source execution and visible source status |
| Academic Search | Merged OpenAlex, Crossref, and Semantic Scholar results with deduplication, ranking, caching, and partial-failure recovery |
| AI Analysis | Gemini, OpenAI, and DeepSeek research answers; DeepSeek model discovery and automatic fallback instead of one hard-coded model |
| Rich Answers | Markdown, tables, links, code blocks, safe external images, mathematical notation, and Mermaid-compatible content rendering |
| Investigation Board | Persistent infinite canvas with findings, notes, links, images, editable tables, labeled connections, zoom, pan, and multiple boards |
| Research Persistence | Automatic IndexedDB checkpoints after completed sources and restoration after navigation or refresh |
| Query Library | Built-in templates, saved queries, sessions, history, operator reference, and workspace import/export |
| Local Assistant | MiniCPM5-1B through Ollama for private guidance and deterministic in-app navigation/query actions |
| Hermes Agent | Optional local gateway for Hermes tools, skills, and memory with explicit endpoint, key, CORS, and permission controls |

## Visual Query Builder

The builder represents a query as an abstract syntax tree instead of an unstructured string. Every node is either a Boolean group or a search condition. QueryRecon recompiles the tree immediately after each edit.

Supported workflows include:

- Create nested Boolean groups without manually balancing parentheses.
- Combine search operators such as `site`, `filetype`, `intitle`, `inurl`, and free text.
- Generate a starting AST from a natural-language description.
- View a plain-language explanation of the compiled query.
- Run a local assessment for breadth, sensitivity, and likely usefulness.
- Undo or redo query-tree mutations.
- Start from a built-in template, then modify it visually.
- Save the finished query or send it into Research Mode.

Example intent:

```text
Find public PDF security reports on example.com that mention ransomware,
but exclude press releases.
```

The important difference is that the resulting logic remains editable as a tree; it is not trapped inside a generated text string.

## Research Mode

Research Mode treats the user's question as the task and collected material as evidence. It does not mistake the question itself for a source document. When collected sources cannot verify a claim, the answer should distinguish general model knowledge from source-backed findings.

### Research depth

| Mode | Collection strategy | Answer style | Relative usage |
| --- | --- | --- | --- |
| Quick | Focused selected sources and a compact result set | Short answer with key facts | `$` |
| Balanced | Broader retrieval and more supporting material | Explanations, examples, and trade-offs | `$$` |
| Deep | Topic-aware source expansion, larger result limits, and deeper evidence collection | Detailed report, comparison tables, caveats, and decision criteria | `$$$` |

The dollar symbols show relative provider usage, not a price quote. Actual cost depends on the selected AI provider, available model, source count, prompt size, and answer length.

### Built-in research sources

| Source group | Providers and behavior |
| --- | --- |
| Reference | Wikipedia with focused query expansion and fallback searches |
| Academic | OpenAlex, Crossref, and Semantic Scholar merged into one deduplicated result set |
| Books | Google Books metadata and descriptions |
| Documents | Topic-aware document search strategies and file-oriented dorks |
| Video | YouTube search links and targeted video queries |
| News | News-focused search strategies |
| Environment | OpenWeatherMap when an API key is configured |
| Security | AlienVault OTX and URLhaus integrations |
| Reconnaissance | DomainsDB domain lookup |
| Government | OpenFEC candidate data when configured |
| Cryptocurrency | CoinGecko search |
| Generic APIs | JSON responses normalized into readable titles, URLs, snippets, and metadata |

Collectors run independently where possible. A failed `429`, network error, CORS rejection, or unavailable public API remains visible without erasing successful results from other sources.

### Academic result recovery

Academic research does not depend on a single provider:

1. QueryRecon expands comparison and natural-language questions into focused searches.
2. OpenAlex, Crossref, and Semantic Scholar run as a provider group.
3. Papers are deduplicated by DOI and normalized title.
4. Results are ranked using relevance, citations, and recency signals.
5. Provider status is retained so “no matches” is not confused with “provider failed.”
6. Successful responses are cached locally to reduce repeated public-API traffic.

### Automatic research saving

Research work is checkpointed into IndexedDB as sources complete. QueryRecon restores the latest topic, selected sources, answer depth, collected results, findings, and active tab when Research Mode mounts again. Navigating to another page does not intentionally discard the active investigation.

## Investigation Board

The board turns collected material into a persistent visual investigation rather than a flat list.

Available node types:

- Finding cards for collected evidence.
- Notes for hypotheses, questions, and analyst commentary.
- Link cards for external references.
- Image cards for visual evidence.
- Editable tables with dynamic rows, columns, and cells.

Boards support multiple saved workspaces, draggable positioning, labeled edges, zooming, panning, and persistent node data through IndexedDB.

## AI and local-agent support

### Cloud AI providers

| Provider | Use in QueryRecon |
| --- | --- |
| Google Gemini | Natural-language query parsing and research summarization |
| OpenAI | Advanced research analysis |
| DeepSeek | Cost-aware research analysis with runtime model discovery, ranking, and fallback |

Provider model names are not assumed to exist forever. DeepSeek queries the models available to the supplied key and can select an appropriate available model instead of relying only on a hard-coded identifier.

### Private MiniCPM5 assistant through Ollama

QueryRecon supports **OpenBMB MiniCPM5-1B Q4_K_M** as a compact local guide. Direct Ollama mode can:

- Explain QueryRecon pages and workflows.
- Open recognized application pages.
- Create or replace a Query Builder query from a user request.
- Undo the latest query edit.

In-app actions are determined and validated by QueryRecon rather than trusting arbitrary model-generated tool calls. MiniCPM chat runs with thinking disabled for faster local responses. The assistant receives no filesystem, shell, deletion, or arbitrary network tool from QueryRecon.

Default configuration:

```text
Ollama endpoint: http://localhost:11434
Model name:      minicpm5-1b
```

Create the model from a downloaded GGUF with a Modelfile:

```text
FROM C:/path/to/MiniCPM5-1B-Q4_K_M.gguf

TEMPLATE """{{- if .Messages -}}
{{- range .Messages -}}
<|im_start|>{{ .Role }}
{{ .Content }}<|im_end|>
{{ end -}}
<|im_start|>assistant
{{ end -}}"""

PARAMETER stop "<|im_end|>"
PARAMETER stop "</s>"
PARAMETER temperature 0.7
PARAMETER top_p 0.95
PARAMETER num_ctx 8192
```

Then run:

```powershell
ollama create minicpm5-1b -f .\Modelfile
ollama list
```

For Hermes workloads, a larger context such as `65536` may be required, but it consumes substantially more RAM than the 8K laptop-friendly configuration.

### Hermes Agent gateway

Hermes mode connects QueryRecon to the local Hermes OpenAI-compatible API. Hermes supplies its own tools, skills, memory, and permission model; QueryRecon does not silently convert Hermes text into browser actions.

Configure Hermes to use MiniCPM through Ollama:

```yaml
model:
  provider: custom
  default: minicpm5-1b
  base_url: http://localhost:11434/v1
```

Enable the Hermes API server in `%USERPROFILE%\.hermes\.env`:

```env
API_SERVER_ENABLED=true
API_SERVER_KEY=replace-with-a-strong-local-secret
API_SERVER_CORS_ORIGINS=http://localhost:5173
```

Start the gateway:

```powershell
hermes gateway
```

Then select **Hermes Agent — local gateway** in QueryRecon Settings and use `http://localhost:8642` as the endpoint.

> Hermes can access terminal, filesystem, browser, and other toolsets enabled in its own configuration. Keep the gateway bound to localhost, require an API key, restrict CORS, and disable toolsets you do not want it to use.

## Architecture

QueryRecon is a client-side React application with separated UI, domain, research, and persistence layers.

```mermaid
flowchart TB
    UI[React pages and components]
    QB[Query AST and compiler]
    RI[Research orchestration]
    AI[AI provider adapters]
    LA[Ollama and Hermes adapters]
    ST[Zustand application state]
    DB[(Dexie / IndexedDB)]
    EXT[Public APIs and AI providers]

    UI --> QB
    UI --> RI
    UI --> ST
    UI --> LA
    QB --> ST
    RI --> AI
    RI --> EXT
    RI --> DB
    ST --> DB
    AI --> EXT
```

Important directories:

```text
src/
├── app/                 Application shell and routes
├── components/
│   ├── assistant/       Local MiniCPM and Hermes interface
│   ├── board/           Investigation-board node types
│   ├── layout/          Sidebar and application layout
│   ├── research/        Rich research-answer rendering
│   └── ui/              Shared controls, toasts, and activity states
├── core/
│   ├── ai/              AI orchestration modules
│   ├── research/        Source collectors, normalization, caching, expansion
│   ├── compiler.ts      AST-to-query compiler
│   ├── query.ts         Query types
│   ├── queryIntelligence.ts
│   └── localAssistant.ts
├── pages/               Dashboard, Builder, Research, Board, Settings, libraries
└── store/               Zustand stores and Dexie database
```

## Application pages

| Route | Purpose |
| --- | --- |
| `/dashboard` | Start a query or enter a research workflow |
| `/builder` | Build and assess the visual query AST |
| `/research-mode` | Run multi-source research and generate evidence-aware answers |
| `/board` | Organize findings on the investigation canvas |
| `/templates` | Browse and apply reusable query templates |
| `/saved` | Reopen saved queries |
| `/sessions` | Manage saved work sessions |
| `/history` | Review prior query activity |
| `/operators` | Browse supported search operators |
| `/settings` | Configure AI providers, local runtimes, and workspace data |

## Getting started

### Requirements

- Node.js 18 or newer
- npm
- Optional: Ollama for MiniCPM local inference
- Optional: Hermes Agent for the Hermes gateway runtime

### Install and run

```bash
git clone https://github.com/GajjarKashyap/QueryRecon.git
cd QueryRecon
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### Production build

```bash
npm run build
npm run preview
```

### Quality commands

```bash
npm run lint
npm run build
```

## Configuration

API keys are configured inside the Settings page. Keys are stored in the browser and sent directly to the selected provider from the client application; QueryRecon does not include an application server that receives or stores them.

Some public APIs may still impose rate limits, require keys, or reject browser requests because of their own CORS policy. QueryRecon reports these failures and preserves results from successful sources.

## Import, export, and local data

The Settings page can export sessions, saved queries, and history as JSON and restore a previously exported workspace. Research sessions, boards, findings, caches, and preferences remain local to the browser profile unless the user explicitly exports or sends data to a configured provider.

Before clearing browser storage, changing browser profiles, or moving devices, export important workspace data.

## Privacy and security model

- Local workspace data is stored in IndexedDB and browser storage.
- Cloud AI prompts are sent only when the corresponding provider is selected and configured.
- Direct Ollama prompts remain on the configured Ollama endpoint.
- Hermes permissions are controlled by the Hermes installation, not by QueryRecon.
- Rendered research images and links are restricted to safe external URL handling.
- QueryRecon is an analysis and query-construction tool; it does not grant authorization to access a target.

Use QueryRecon only for lawful research, defensive security, authorized testing, journalism, academic work, and investigations where you have the right to collect and process the data.

## Current limitations

- Public providers can rate-limit, change schemas, or block browser-origin requests.
- AI answer quality depends on the chosen provider, model, keys, and collected evidence.
- MiniCPM5-1B is intentionally small; it is useful for guidance but less capable than larger local or cloud models.
- Hermes API mode uses Hermes tools and memory, but does not currently receive QueryRecon's in-browser navigation tools dynamically.
- Local browser storage is not automatically synchronized across devices.
- A large Ollama context can require several gigabytes of memory even when model weights are small.

## Roadmap

- [x] Visual AST query builder and compiler
- [x] Natural-language query starting points and assessments
- [x] Multi-source Research Mode with depth controls
- [x] Resilient three-provider academic search
- [x] Rich research-answer rendering
- [x] Automatic research checkpoints and restoration
- [x] Persistent investigation board with multiple node types
- [x] DeepSeek model discovery and fallback
- [x] Private MiniCPM5 assistant through Ollama
- [x] Hermes Agent gateway support
- [ ] Encrypted optional cloud synchronization
- [ ] Cross-device investigation history
- [ ] Pluggable collector SDK

## Contributing

Issues and pull requests are welcome. Keep new collectors independently failure-tolerant, normalize external data before it reaches the UI, avoid hard-coding model identifiers when discovery is available, and preserve the local-first behavior unless a feature explicitly requires an external service.

### Ponytail agent workflow

This repository includes `AGENTS.md` instructions for [Ponytail](https://github.com/DietrichGebert/ponytail): understand the full flow, then prefer the smallest correct implementation, existing code, native platform features, and installed dependencies.

Codex installation:

```powershell
codex plugin marketplace add DietrichGebert/ponytail
codex plugin add ponytail@ponytail
```

Restart Codex after installation, review and trust the two lifecycle hooks with `/hooks`, and begin a new task. Hermes Agent can load the same policy and bundled commands with:

```powershell
hermes plugins install DietrichGebert/ponytail --enable
```

Restart Hermes after enabling it. Ponytail governs developer agents; it is not injected into ordinary Gemini, OpenAI, or DeepSeek research API calls.
