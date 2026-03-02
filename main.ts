import { App, Plugin, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { VectorStorage } from 'src/VectorStorage';
import { LLMConnectionPrompter } from 'src/LLMConnectionPrompter';
import { ConnectionGenerator } from 'src/ConnectionGenerator';
import { NoteBudView, VIEW_NOTEBUD } from 'src/NoteBudView';
import { SettingTab } from 'src/SettingsTab';
import { NoteBudSettings, DEFAULT_SETTINGS } from 'src/types';

export default class NoteBud extends Plugin {
	settings: NoteBudSettings;
	vectorStore: VectorStorage;
	llmConnectionPrompter: LLMConnectionPrompter;
	connectionGenerator: ConnectionGenerator;

	async onload() {
		await this.loadSettings();

		if (!this.settings.apiKey.trim()) {
			new Notice('NoteBud: No API key set. Please configure it in plugin settings.');
		}

		this.vectorStore = new VectorStorage(this.app, this, this.settings);
		this.llmConnectionPrompter = new LLMConnectionPrompter(this.app, this, this.settings);
		this.connectionGenerator = new ConnectionGenerator(this.vectorStore, this.llmConnectionPrompter, this.app);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this, () => this.reinitializeServices()));

		this.registerView(
			VIEW_NOTEBUD,
			(leaf) => new NoteBudView(leaf, this.connectionGenerator, this.app, this)
		  );
	  
		  this.addRibbonIcon('scroll', 'Find connections in your notes with NoteBud', () => {
			this.activateView();
		  });

		this.registerEvent(this.app.vault.on('modify', this.onFileModify, this));
		this.registerInterval(
			window.setInterval(() => this.vectorStore.saveEmbeddings(), 16 * 1000)
		  );
		


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Reinitializes VectorStorage and LLMConnectionPrompter with updated settings
	 */
	reinitializeServices(): void {
		this.vectorStore.initializeEmbeddings(this.settings);
		this.llmConnectionPrompter.initializeLLM(this.settings);

		this.app.workspace.getLeavesOfType(VIEW_NOTEBUD).forEach(leaf => {
			(leaf.view as NoteBudView).renderInitialView();
		});
	}

	async activateView() {
		const { workspace } = this.app;
	
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_NOTEBUD);
	
		if (leaves.length > 0) {
		  // A leaf with our view already exists, use that
		  leaf = leaves[0];
		} else {
		  // Our view could not be found in the workspace, create a new leaf
		  // in the right sidebar for it
		  leaf = workspace.getRightLeaf(false);
		  if (leaf) await leaf.setViewState({ type: VIEW_NOTEBUD, active: true });
		}
	
		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) workspace.revealLeaf(leaf);
	}

	async onFileModify(file: TFile) {
		console.log("File modified:", file.path);
		this.vectorStore.maybeReplaceFileInStorage(file);
	}
}
