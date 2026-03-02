# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

NoteBud is an Obsidian plugin that uses AI to find connections between notes. It uses vector embeddings to find semantically similar notes and an LLM to generate editorial feedback and connection descriptions.

## Build & Development Commands

```bash
# Development (watch mode - outputs to main.js)
npm run dev

# Production build (type-checks first, then bundles minified)
npm run build

# Bump version (updates manifest.json and versions.json)
npm run version
```

There are no tests in this project.

**To use the plugin locally**: symlink or copy the repo folder into an Obsidian vault's `.obsidian/plugins/` directory. The built `main.js`, `manifest.json`, and `styles.css` (if any) are what Obsidian loads.

## Architecture

The plugin follows a layered architecture with a single entry point (`main.ts`) that wires everything together:

```
main.ts (NoteBud Plugin)
├── VectorStorage       — in-memory vector store; indexes vault files as chunks; persists embeddings to .obsidian/plugins/notebud/data/embeddings.json
├── LLMConnectionPrompter — sends current note + similar chunks to GitHub AI (OpenAI-compatible) and returns structured JSON (editorial + connections)
├── ConnectionGenerator — orchestrates VectorStorage.search() → LLMConnectionPrompter.generateConnections()
├── NoteBudView         — Obsidian ItemView (right sidebar panel) with "Find Connections" button; renders results
└── SettingsTab         — Obsidian settings UI; triggers reinitializeServices() on change
```

**Data flow when user clicks "Find Connections":**
1. `NoteBudView` reads the active file from the workspace
2. `ConnectionGenerator.generateConnections(file)` reads file content, searches `VectorStorage` for top-10 similar chunks from *other* files
3. `LLMConnectionPrompter.generateConnections(content, chunks)` calls the LLM via LangChain and parses JSON output
4. Results (`ConnectionOutput`) are rendered in the sidebar with clickable note links

**Embedding persistence:** Embeddings are stored to disk every 16 seconds via `setInterval`. On plugin load, `VectorStorage.load()` reads existing embeddings from disk, then indexes any un-indexed vault files. When a file is modified (`vault.on('modify')`), its chunks are replaced in the in-memory store.

**Chunk IDs:** Each chunk is identified as `<basename>-<index>` (e.g., `MyNote-0`, `MyNote-1`). The `index` Set tracks both chunk IDs and basenames to skip already-indexed files.

## Key Configuration

- Default API endpoint: `https://models.github.ai/inference` (GitHub AI, OpenAI-compatible)
- Default embedding model: `openai/text-embedding-3-small`
- Default LLM: `gpt-4o-mini`
- API key is stored in Obsidian plugin data (not hardcoded); set it in plugin Settings tab
- Chunk size: 2000 chars, overlap: 500 chars; 16-second delay between chunk embedding calls (rate limiting)

## Important Patterns

- `obsidian`, `electron`, and all `@codemirror/*` / `@lezer/*` modules are **external** (provided by Obsidian at runtime) — never bundle them
- Both `VectorStorage` and `LLMConnectionPrompter` have `initializeEmbeddings()` / `initializeLLM()` methods called on settings change via `reinitializeServices()` — this is how API key/model updates take effect without reloading the plugin
- `noImplicitAny` and `strictNullChecks` are enabled; null-check `this.storage` and `this.embeddings` before use
- `src/types.ts` defines all shared interfaces (`NoteBudSettings`, `ChunkData`, `ConnectionOutput`)
