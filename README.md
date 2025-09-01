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

This plugin requires a GitHub API key to access GitHub AI models. 

1. Enable the plugin in Obsidian settings
2. Go to the plugin settings tab
3. Enter your GitHub API key in the "GitHub API Key" field
4. Optionally customize the model settings:
   - **Embedding Model**: The embedding model to use (default: `openai/text-embedding-3-small`)
   - **LLM Model**: The language model for text generation (default: `gpt-4o-mini`)
   - **Model URL**: The base URL for the AI model API (default: `https://models.github.ai/inference`)

### Getting a GitHub API Key
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name
4. Select the necessary scopes for GitHub AI models
5. Copy the generated token (it starts with `ghp_`)

**Security Note**: Never commit your API key to version control. 
