# NoteBud

An LLM-based plugin for Obsidian that helps you find connections between your notes using AI-powered analysis.

This project uses TypeScript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in TypeScript Definition format, which contains TSDoc comments describing what it does.

NoteBud uses AI to analyze your notes and discover meaningful connections between them:
- **Vector Search**: Finds semantically similar content across your vault
- **AI-Powered Connections**: Uses LLMs to identify relationships between notes
- **Editorial Suggestions**: Provides writing improvements and suggestions
- **Smart Navigation**: Helps you discover related content you might have missed

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## API Key Setup

This plugin requires a GitHub API key to access GitHub AI models. You can set up your API key in one of the following ways:

### Option 1: Plugin Settings (Recommended)
1. Enable the plugin in Obsidian settings
2. Go to the plugin settings tab
3. Enter your GitHub API key in the "GitHub API Key" field
4. Optionally customize the model settings:
   - **Embedding Model**: The embedding model to use (default: `openai/text-embedding-3-small`)
   - **LLM Model**: The language model for text generation (default: `gpt-4o-mini`)
   - **Model URL**: The base URL for the AI model API (default: `https://models.github.ai/inference`)

### Option 2: Environment Variable
1. Create a `.env` file in the plugin directory (see `env.example` for reference)
2. Add your API key: `GITHUB_API_KEY=ghp_your_api_key_here`
3. The `.env` file is already added to `.gitignore` for security

**Note**: Only the API key can be set via environment variables. Model settings use sensible defaults and can be customized through the plugin settings UI.

### Getting a GitHub API Key
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name
4. Select the necessary scopes for GitHub AI models
5. Copy the generated token (it starts with `ghp_`)

**Security Note**: Never commit your API key to version control. The `.env` file is already excluded from git tracking.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/notebud/`.

