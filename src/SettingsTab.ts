import { App, PluginSettingTab, Setting } from 'obsidian';
import { NoteBudSettings, DEFAULT_SETTINGS } from './types';

export class SettingTab extends PluginSettingTab {
	plugin: any; // Using any to avoid circular dependency

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('GitHub API Key')
			.setDesc('Your GitHub API key for accessing GitHub AI models. You can also set this via GITHUB_API_KEY environment variable.')
			.addText(text => text
				.setPlaceholder('ghp_... or set GITHUB_API_KEY env var')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Embedding Model')
			.setDesc('The AI model to use for embeddings and text generation')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.embeddingModel)
				.setValue(this.plugin.settings.embeddingModel)
				.onChange(async (value) => {
					this.plugin.settings.embeddingModel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('LLM Model')
			.setDesc('The AI model to use for LLM connections and text generation')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.llmModel)
				.setValue(this.plugin.settings.llmModel)
				.onChange(async (value) => {
					this.plugin.settings.llmModel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model URL')
			.setDesc('The base URL for the AI model API')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.modelUrl)
				.setValue(this.plugin.settings.modelUrl)
				.onChange(async (value) => {
					this.plugin.settings.modelUrl = value;
					await this.plugin.saveSettings();
				}));
	}
}
