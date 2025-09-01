import { App, ItemView, WorkspaceLeaf, Workspace } from 'obsidian';
import { ConnectionGenerator } from './ConnectionGenerator';
import { ConnectionOutput } from './types';

export const VIEW_NOTEBUD = 'notebud-chat';

export class NoteBudView extends ItemView {
	connectionGenerator: ConnectionGenerator;
	workspace: Workspace;
	app: App;

	constructor(leaf: WorkspaceLeaf, connectionGenerator: ConnectionGenerator, app: App) {
		super(leaf);
		this.connectionGenerator = connectionGenerator;
		this.app = app;
		this.workspace = this.app.workspace;
	}

	getViewType() {
		return VIEW_NOTEBUD;
	}

	getDisplayText() {
		return 'NoteBud - AI Note Connections';
	}

	async onOpen() {
		const container = this.contentEl;
		container.empty();
		container.createEl('h4', { text: 'NoteBud' });
		const button = container.createEl('button', {text: 'Find Connections'});
		button.onClickEvent(async () => {
			console.log("hello 1");
			const file = this.workspace.getActiveFile();
			if (file) {
				const contents = await this.app.vault.cachedRead(file);
				
				// Create loading message
				const loadingEl = container.createEl('p', {text: 'Analyzing your notes and finding connections...'});
				loadingEl.addClass('loading-message');
				const linka = container.createEl('a', {
					text: 'new link?',
					cls: 'internal-link'
				});
				linka.addEventListener("click", (e)=>{ 
					this.navigateTo("test.md");
				});
				// linka.setAttribute('href', "./test.md");
				
				try {
					const result = await this.connectionGenerator.generateConnections(contents);
					console.log("done");
					console.log("Result:", result);
					// Remove loading message
					loadingEl.remove();
					
					// Display results
					const resultEl = container.createDiv({cls: "is-clickable"})
					// Create Editorial section
					if (result.editorial && result.editorial.length > 0) {
						console.log("Creating editorial section with", result.editorial.length, "items");
						const editorialEl = resultEl.createEl('h1', {text: 'Editorial'});
						const editorialList = resultEl.createEl('ul');
						result.editorial.forEach(suggestion => {
							editorialList.createEl('li', {text: suggestion});
						});
					} else {
						console.log("No editorial suggestions found");
					}
					
					// Create Connections section
					if (result.connections && result.connections.length > 0) {
						console.log("Creating connections section with", result.connections.length, "items");
						const connectionEl = resultEl.createEl('h1', {text: 'Connections'});
						const connectionsList = resultEl.createEl('ul');
						result.connections.forEach(connection => {
							const listItem = connectionsList.createEl('li');
							listItem.innerHTML = `${connection.connection} Source: `;
							
							// Create the internal link
							const link = listItem.createEl('a', {
								text: connection.source_id,
								cls: 'internal-link'
							});
							link.setAttribute('href', `${connection.source_id}.md`);
							link.addEventListener("click", (e)=>{ 
								this.navigateTo(connection.source_id);
							});
						});
					} else {
						console.log("No connections found");
					}
					
					
					// // Show message if no results found
					// if (chunks.length === 0) {
					// 	container.createEl('p', {text: 'No similar content found'});
					// }
				} catch (error) {
					// Remove loading message and show error
					loadingEl.remove();
					container.createEl('p', {text: `Error: ${error.message}`});
					console.error('Search error:', error);
				}
			} else {
				container.createEl('p', {text: 'No active file found. Please open a note to find connections.'})
			}

			
		});
	}

	navigateTo(name: string){
		console.log(name);
		name = name.split('-')[0]
		console.log("again", name)
		const firstLink=this.app.metadataCache.getFirstLinkpathDest(name, '');
		console.log("firstLink", this.app.metadataCache.getFirstLinkpathDest(name, ''))
		console.log("secondLink", this.app.metadataCache.getFirstLinkpathDest('', name))

		if(firstLink){
			this.app.workspace.openLinkText(firstLink.name, firstLink.path);
			return;
		}
		const secondLink=this.app.metadataCache.getFirstLinkpathDest('', name);

		if(secondLink){
			this.app.workspace.openLinkText(secondLink.name, secondLink.path);
			return
		}

		name = 'Commonplace/Blogs/Database index Blog.md'
		const link=this.app.metadataCache.getFirstLinkpathDest(name, '');
		console.log("new", link)
		if(link){
			this.app.workspace.openLinkText(link.name, link.path);
			return;
		}

	}

	async onClose() {
		// Nothing to clean up.
	}
}
