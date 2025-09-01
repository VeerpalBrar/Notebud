import { VectorStorage } from "./VectorStorage";
import { LLMConnectionPrompter } from "./LLMConnectionPrompter";

export class ConnectionGenerator {
    vectorStorage: VectorStorage;
    llmConnectionPrompter: LLMConnectionPrompter;

    constructor(vectorStorage: VectorStorage, llmConnectionPrompter: LLMConnectionPrompter) {
        this.vectorStorage = vectorStorage;
        this.llmConnectionPrompter = llmConnectionPrompter;

    }

    async generateConnections(contents: string) {
        console.debug("Searching for chunks...");
        const chunks = await this.vectorStorage.search(contents, 10);
        console.debug("Number of chunks:", chunks.length);
        
        if (chunks.length === 0) {
            console.warn("No chunks found from vector search");
            return {
                editorial: [],
                connections: []
            };
        }
        
        const result = await this.llmConnectionPrompter.generateConnections(contents, chunks);
        return result;
    }
}