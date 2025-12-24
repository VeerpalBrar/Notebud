import { VectorStorage } from "./VectorStorage";
import { LLMConnectionPrompter } from "./LLMConnectionPrompter";
import { App, TFile } from "obsidian";

export class ConnectionGenerator {
    vectorStorage: VectorStorage;
    llmConnectionPrompter: LLMConnectionPrompter;
    app: App;

    constructor(vectorStorage: VectorStorage, llmConnectionPrompter: LLMConnectionPrompter, app: App) {
        this.vectorStorage = vectorStorage;
        this.llmConnectionPrompter = llmConnectionPrompter;
        this.app = app;
    }

    async generateConnections(file: TFile) {
        console.log("Searching for chunks...");
        const contents = await this.app.vault.cachedRead(file);
        let chunks = await this.vectorStorage.search(contents, 10);
        console.log("Chunks found:", chunks);
        console.log("Number of chunks:", chunks.length);
        
        if (chunks.length === 0) {
            console.warn("No chunks found from vector search");
            return {
                editorial: [],
                connections: []
            };
        }

        // filter chunks to not include chunks from the same file
        chunks  = chunks.filter(chunk => chunk.file !== file.basename);
        
        const result = await this.llmConnectionPrompter.generateConnections(contents, chunks);
        return result;
    }
}