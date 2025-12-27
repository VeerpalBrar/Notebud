import { App, ItemView, WorkspaceLeaf, Workspace, TFile } from 'obsidian';
import { ConnectionGenerator } from './ConnectionGenerator';
import { ConnectionOutput } from './types';
import NoteBud from 'main';

export const VIEW_NOTEBUD = 'notebud-chat';

// UI Constants
const UI_TEXT = {
	title: 'NoteBud',
	button: 'Find Connections',
	loading: 'Analyzing your notes and finding connections...',
	noActiveFile: 'No active file found. Please open a note to find connections.',
	noEditorial: 'No editorial suggestions found',
	noConnections: 'No connections found',
	errorPrefix: 'Error: ',
	sectionEditorial: 'Editorial',
	sectionConnections: 'Connections',
	connectionSourcePrefix: 'Source: ',
	apiKeyNotSet: 'Please configure the API key in the plugin settings to use this feature.',
} as const;

export class NoteBudView extends ItemView {
	private connectionGenerator: ConnectionGenerator;
	private workspace: Workspace;
	private plugin: NoteBud;

	constructor(leaf: WorkspaceLeaf, connectionGenerator: ConnectionGenerator, app: App, plugin: NoteBud) {
		super(leaf);
		this.connectionGenerator = connectionGenerator;
		this.workspace = app.workspace;
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_NOTEBUD;
	}

	getDisplayText(): string {
		return 'NoteBud - AI Note Connections';
	}

	async onOpen(): Promise<void> {
		this.renderInitialView();
	}

	async onClose(): Promise<void> {
		// Nothing to clean up.
	}

	/**
	 * Renders the initial view with the title and find connections button
	 */
	private renderInitialView(): void {
		const container = this.contentEl;
		container.empty();
		
		container.createEl('h4', { text: UI_TEXT.title });
		
		const button = container.createEl('button', { text: UI_TEXT.button });
		
		// Check if API key is set
		if (!this.plugin.settings.apiKey) {
			container.createEl('p', { text: UI_TEXT.apiKeyNotSet });
			button.disabled = true;
			return;
		}
		
		button.onClickEvent(() => this.handleFindConnections(container));
	}

	/**
	 * Handles the find connections button click
	 */
	private async handleFindConnections(container: HTMLElement): Promise<void> {
		const activeFile = this.workspace.getActiveFile();
		
		if (!activeFile) {
			this.showMessage(container, UI_TEXT.noActiveFile);
			return;
		}

		const loadingEl = this.showLoadingMessage(container);
		
		try {
			const result = await this.connectionGenerator.generateConnections(activeFile);
			loadingEl.remove();
			this.renderResults(container, result);
		} catch (error) {
			loadingEl.remove();
			this.showError(container, error);
		}
	}

	/**
	 * Shows a loading message while processing
	 */
	private showLoadingMessage(container: HTMLElement): HTMLElement {
		const loadingEl = container.createEl('p', { text: UI_TEXT.loading });
		loadingEl.addClass('loading-message');
		return loadingEl;
	}

	/**
	 * Renders the connection results
	 */
	private renderResults(container: HTMLElement, result: ConnectionOutput): void {
		const resultEl = container.createDiv({ cls: 'is-clickable' });
		
		this.renderEditorialSection(resultEl, result.editorial);
		this.renderConnectionsSection(resultEl, result.connections);
	}

	/**
	 * Renders the editorial suggestions section
	 */
	private renderEditorialSection(parent: HTMLElement, editorial: string[]): void {
		if (editorial && editorial.length > 0) {
			parent.createEl('h1', { text: UI_TEXT.sectionEditorial });
			const editorialList = parent.createEl('ul');
			
			editorial.forEach(suggestion => {
				editorialList.createEl('li', { text: suggestion });
			});
		} else {
			parent.createEl('p', { text: UI_TEXT.noEditorial });
		}
	}

	/**
	 * Renders the connections section
	 */
	private renderConnectionsSection(
		parent: HTMLElement,
		connections: ConnectionOutput['connections']
	): void {
		if (connections && connections.length > 0) {
			parent.createEl('h1', { text: UI_TEXT.sectionConnections });
			const connectionsList = parent.createEl('ul');
			
			connections.forEach(connection => {
				this.renderConnectionItem(connectionsList, connection);
			});
		} else {
			parent.createEl('p', { text: UI_TEXT.noConnections });
		}
	}

	/**
	 * Renders a single connection item with a clickable link
	 */
	private renderConnectionItem(
		parent: HTMLElement,
		connection: ConnectionOutput['connections'][0]
	): void {
		const listItem = parent.createEl('li');
		const sourceName = this.extractSourceName(connection.source_id);
		
		// Create connection text
		listItem.createSpan({ text: `${connection.connection} ${UI_TEXT.connectionSourcePrefix}` });
		
		// Create clickable link
		const link = listItem.createEl('a', {
			text: sourceName,
			cls: 'internal-link',
			href: `${sourceName}.md`,
		});
		
		link.addEventListener('click', (e) => {
			e.preventDefault();
			this.navigateTo(connection.source_id);
		});
	}

	/**
	 * Extracts the source name from a source ID (removes suffix after hyphen)
	 */
	private extractSourceName(sourceId: string): string {
		return sourceId.split('-')[0];
	}

	/**
	 * Shows an error message to the user
	 */
	private showError(container: HTMLElement, error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : String(error);
		this.showMessage(container, `${UI_TEXT.errorPrefix}${errorMessage}`);
		console.error('Search error:', error);
	}

	/**
	 * Shows a simple message to the user
	 */
	private showMessage(container: HTMLElement, message: string): void {
		container.createEl('p', { text: message });
	}

	/**
	 * Navigates to a note by its source ID
	 */
	private navigateTo(sourceId: string): void {
		const sourceName = this.extractSourceName(sourceId);
		
		// Try to find the link in the current file first
		const linkInCurrentFile = this.app.metadataCache.getFirstLinkpathDest('', sourceName);
		if (linkInCurrentFile) {
			this.app.workspace.openLinkText(linkInCurrentFile.name, linkInCurrentFile.path);
			return;
		}

		// Try to find the link globally
		const globalLink = this.app.metadataCache.getFirstLinkpathDest(sourceName, '');
		if (globalLink) {
			this.app.workspace.openLinkText(globalLink.name, globalLink.path);
		}
	}
}
