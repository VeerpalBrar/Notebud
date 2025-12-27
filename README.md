# NoteBud

An LLM-based plugin for Obsidian that helps you find connections between your notes using AI-powered analysis.

# Overview 
This plugin implements RAG search on all your obsidian notes to find related notes. Then it uses LLMs to help build connections between new notes and existing notes. The LLM also provides editorical suggestions to improve your writing. 

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## API Key Setup

This plugin requires a GitHub API key to access GitHub AI models. 

### Getting a GitHub API Key
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name
4. Select the necessary scopes for GitHub AI models
5. Copy the generated token (it starts with `ghp_`)

**Security Note**: Never commit your API key to version control. The `.env` file is already excluded from git tracking.

### Plugin Settings 
1. Enable the plugin in Obsidian settings
2. Go to the plugin settings tab
3. Enter your GitHub API key in the "GitHub API Key" field
4. Optionally customize the model settings:
   - **Embedding Model**: The embedding model to use (default: `openai/text-embedding-3-small`)
   - **LLM Model**: The language model for text generation (default: `gpt-4o-mini`)
   - **Model URL**: The base URL for the AI model API (default: `https://models.github.ai/inference`)

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/notebud/`.

# How does it work?
1. The plugin first generates embeddings for all of your notes and stores them in a vector store.

2. When you ask the plugin to generate suggestions for the currently open file, it:

- Generates embeddings for the open file

- Performs a similarity search to find the 10 most semantically related document chunks

= Passes the open file and the retrieved document chunks to an LLM

- Prompts the LLM to identify three meaningful connections between the open file and the related documents

3. The plugin then displays the LLM’s response to the user.

