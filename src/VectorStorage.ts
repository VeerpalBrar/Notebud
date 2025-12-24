import NoteBud from "main";
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { App, TFile } from 'obsidian';
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChunkData } from './types';

// Constants
const EMBEDDING_CONFIG = {
    CHUNK_SIZE: 2000,
    CHUNK_OVERLAP: 500,
    EMBEDDING_TIMEOUT_MS: 15000,
    DELAY_BETWEEN_CHUNKS_MS: 16000,
} as const;

const TEXT_SPLITTER_SEPARATORS = ["\n\n", "\n", " ", ""] as const;

type SearchResult = [Document, number];

export class VectorStorage {
    private plugin: NoteBud;
    private app: App;
    private storage: MemoryVectorStore;
    private embeddings: OpenAIEmbeddings;
    private index: Set<string>;
    private readonly embeddingsPath: string;
    private textSplitter: RecursiveCharacterTextSplitter;

    constructor(app: App, plugin: NoteBud, settings: NoteBud['settings']) {
        this.plugin = plugin;
        this.app = app;

        this.embeddings = new OpenAIEmbeddings({
            modelName: settings.embeddingModel,
            openAIApiKey: settings.apiKey,
            configuration: {
                baseURL: settings.modelUrl,
                dangerouslyAllowBrowser: true
            }
        });
        
        this.storage = new MemoryVectorStore(this.embeddings);
        this.index = new Set();
        
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: EMBEDDING_CONFIG.CHUNK_SIZE,
            chunkOverlap: EMBEDDING_CONFIG.CHUNK_OVERLAP,
            separators: [...TEXT_SPLITTER_SEPARATORS]
        });
        
        // Set embeddings path once in constructor
        const pluginId = this.plugin.manifest.id;
        this.embeddingsPath = `.obsidian/plugins/${pluginId}/data/embeddings.json`;

        this.load();
    }

    /**
     * Searches for similar chunks in the vector store
     * @param text - The text to search for
     * @param count - Maximum number of results to return (default: 10)
     * @returns Array of matching chunks
     */
    async search(text: string, count: number = 10): Promise<ChunkData[]> {
        const embeddings = await this.createEmbeddingsWithDelayForSearchText(text);
        console.debug(`[search] Created ${embeddings.length} embeddings`);
        
        const allResults = await this.searchWithEmbeddings(embeddings, count);
        console.debug(`[search] Searched with ${allResults.length} results`);
        const uniqueResults = this.deduplicateAndSortResults(allResults);
        console.debug(`[search] Deduplicated and sorted ${uniqueResults.size} results`);
        
        return this.formatSearchResults(uniqueResults, count);
    }

    /**
     * Searches the vector store with multiple embeddings
     */
    private async searchWithEmbeddings(
        embeddings: number[][],
        count: number
    ): Promise<SearchResult[]> {
        const allResults: SearchResult[] = [];
        
        for (const embedding of embeddings) {
            const results = await this.storage.similaritySearchVectorWithScore(embedding, count);
            allResults.push(...results);
        }
        
        return allResults;
    }

    /**
     * Removes duplicates and sorts results by similarity score
     */
    private deduplicateAndSortResults(
        results: SearchResult[]
    ): Map<string, { doc: Document; score: number }> {
        const uniqueResults = new Map<string, { doc: Document; score: number }>();
        
        results
            .sort((a, b) => b[1] - a[1]) // Sort by score descending
            .forEach(([doc, score]) => {
                const key = doc.metadata.id as string;
                if (key && !uniqueResults.has(key)) {
                    uniqueResults.set(key, { doc, score });
                }
            });
        
        return uniqueResults;
    }

    /**
     * Formats search results into ChunkData format
     */
    private formatSearchResults(
        uniqueResults: Map<string, { doc: Document; score: number }>,
        count: number
    ): ChunkData[] {
        return Array.from(uniqueResults.values())
            .slice(0, count)
            .map(({ doc }) => ({
                content: doc.pageContent,
                id: doc.metadata.id as string,
                file: doc.metadata.file as string
            }));
    }

    /**
     * Saves all embeddings from memory to disk
     */
    async saveEmbeddings(): Promise<void> {
        try {
            const chunks = this.extractChunksFromStorage();
            const jsonData = JSON.stringify(chunks, null, 2);
            
            await this.app.vault.adapter.write(this.embeddingsPath, jsonData);
            console.log(`[saveEmbeddings] Saved ${chunks.length} chunks to ${this.embeddingsPath}`);
        } catch (error) {
            this.handleError(error, "Error saving embeddings");
            throw error;
        }
    }

    /**
     * Extracts and validates chunks from the memory vector store
     */
    private extractChunksFromStorage(): ChunkData[] {
        return this.storage.memoryVectors
            .filter(this.isValidMemoryVector)
            .map((mv) => ({
                id: mv.metadata.id as string,
                file: mv.metadata.file as string,
                content: mv.content,
                embedding: mv.embedding
            }));
    }

    /**
     * Validates that a memory vector has all required fields
     */
    private isValidMemoryVector(mv: any): boolean {
        return (
            mv.metadata &&
            typeof mv.metadata.id === 'string' &&
            typeof mv.metadata.file === 'string' &&
            mv.embedding &&
            mv.content
        );
    }

    /**
     * Loads embeddings from disk into memory
     */
    async load(): Promise<void> {
        try {
            if (!(await this.embeddingsFileExists())) {
                console.log("Embeddings file not found, starting with empty storage");
                await this.indexFiles();
                return;
            }

            const chunks = await this.readEmbeddingsFromFile();
            
            if (chunks.length === 0) {
                console.log("No valid embeddings found in file");
                await this.indexFiles();
                return;
            }

            const { embeddings, documents } = this.prepareChunksForStorage(chunks);
            await this.storage.addVectors(embeddings, documents);
            
            console.log(`Loaded ${embeddings.length} embeddings, ${documents.length} documents`);
        } catch (error) {
            this.handleLoadError(error);
        }
        
        // Index all files in the vault after loading completes
        await this.indexFiles();
    }

    /**
     * Checks if the embeddings file exists
     */
    private async embeddingsFileExists(): Promise<boolean> {
        return await this.app.vault.adapter.exists(this.embeddingsPath);
    }

    /**
     * Reads and parses embeddings from the file
     */
    private async readEmbeddingsFromFile(): Promise<ChunkData[]> {
        const data = await this.app.vault.adapter.read(this.embeddingsPath);
        
        if (!data || data.trim().length === 0) {
            console.log("Embeddings file is empty, starting with empty storage");
            return [];
        }

        const parsed: unknown = JSON.parse(data);
        
        if (!Array.isArray(parsed)) {
            console.error("Embeddings file does not contain an array");
            return [];
        }

        return parsed as ChunkData[];
    }

    /**
     * Prepares chunks for storage by validating and converting to embeddings/documents
     */
    private prepareChunksForStorage(chunks: ChunkData[]): {
        embeddings: number[][];
        documents: Document[];
    } {
        const embeddings: number[][] = [];
        const documents: Document[] = [];
        
        chunks.forEach((chunk) => {
            if (!this.isValidChunk(chunk)) {
                console.warn("Skipping invalid chunk:", chunk);
                return;
            }

            embeddings.push(chunk.embedding!);
            documents.push({
                pageContent: chunk.content,
                metadata: {
                    id: chunk.id,
                    file: chunk.file
                }
            });
            
            this.index.add(chunk.id);
            this.index.add(chunk.file);
        });

        return { embeddings, documents };
    }

    /**
     * Validates that a chunk has all required fields
     */
    private isValidChunk(chunk: ChunkData): boolean {
        return !!(
            chunk.embedding &&
            chunk.content &&
            chunk.id &&
            chunk.file
        );
    }

    /**
     * Handles errors during loading with specific error type handling
     */
    private handleLoadError(error: unknown): void {
        if (error instanceof SyntaxError) {
            console.error("Failed to parse embeddings JSON:", error);
        } else {
            this.handleError(error, "Error loading embeddings");
        }
        // Continue with empty storage rather than crashing
    }

    /**
     * Indexes all files in the vault that haven't been indexed yet
     */
    async indexFiles(): Promise<void> {
        try {
            const files = this.app.vault.getFiles();
            console.log(`Starting to index ${files.length} files`);
            
            for (const file of files) {
                if (this.isFileIndexed(file.basename)) {
                    continue;
                }
                
                console.log(`Creating embeddings for ${file.basename}`);
                await this.createEmbeddingForFile(file);
            }
            
            console.log("Completed indexing all files");
        } catch (error) {
            this.handleError(error, "Error indexing files");
            // Continue execution even if indexing fails
        }
    }

    /**
     * Checks if a file has already been indexed
     */
    private isFileIndexed(basename: string): boolean {
        if (this.index.has(basename)) {
            console.debug(`Skipping ${basename} - already indexed`);
            return true;
        }
        return false;
    }

    /**
     * Splits text into chunks for embedding
     */
    async splitTextIntoChunks(text: string): Promise<string[]> {
        const chunks = await this.textSplitter.splitText(text);
        console.debug(`Done splitting text into ${chunks.length} chunks`);
        return chunks;
    }

    /**
     * Creates an embedding for a single chunk with timeout protection
     */
    async createEmbeddingForChunk(chunk: string): Promise<number[]> {
        const timeoutPromise = this.createTimeoutPromise(
            EMBEDDING_CONFIG.EMBEDDING_TIMEOUT_MS,
            'Embedding request timed out'
        );
        
        try {
            const embedding = await Promise.race([
                this.embeddings.embedQuery(chunk),
                timeoutPromise
            ]) as number[];
            
            return embedding;
        } catch (error) {
            console.error("Error creating embedding for chunk:", error);
            return [];
        }
    }

    /**
     * Creates a promise that rejects after the specified timeout
     */
    private createTimeoutPromise(ms: number, message: string): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${message} after ${ms}ms`)), ms);
        });
    }

    /**
     * Creates embeddings for search text with delays between chunks
     */
    async createEmbeddingsWithDelayForSearchText(text: string): Promise<number[][]> {
        const chunks = await this.splitTextIntoChunks(text);
        const embeddings: number[][] = [];
        
        for (let i = 0; i < chunks.length; i++) {
            const embedding = await this.createEmbeddingForChunk(chunks[i]);
            
            if (embedding.length > 0) {
                embeddings.push(embedding);
            }
            
            // Add delay before processing next chunk (except for the last one)
            if (i < chunks.length - 1) {
                await this.sleep(EMBEDDING_CONFIG.DELAY_BETWEEN_CHUNKS_MS);
            }
        }
        
        return embeddings;
    }

    /**
     * Utility function to create a delay
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Replaces existing embeddings for a file with new ones
     */
    async maybeReplaceFileInStorage(file: TFile): Promise<void> {
        const idsToRemove = this.findExistingChunkIds(file.basename);
        
        if (idsToRemove.length > 0) {
            this.removeVectorsFromStorage(idsToRemove);
            this.removeIdsFromIndex(idsToRemove);
        }
        
        this.removeFileBasenameFromIndex(file.basename);
        await this.createEmbeddingForFile(file);
    }

    /**
     * Finds all chunk IDs for a given file basename
     */
    private findExistingChunkIds(basename: string): string[] {
        const idsToRemove: string[] = [];
        let num = 0;
        
        while (true) {
            const id = `${basename}-${num}`;
            if (this.index.has(id)) {
                idsToRemove.push(id);
                num++;
            } else {
                break;
            }
        }
        
        return idsToRemove;
    }

    /**
     * Removes vectors from storage that match the given IDs
     */
    private removeVectorsFromStorage(idsToRemove: string[]): void {
        const beforeCount = this.storage.memoryVectors.length;
        
        this.storage.memoryVectors = this.storage.memoryVectors.filter((mv) => {
            const vectorId = mv.id || mv.metadata?.id;
            return !vectorId || !idsToRemove.includes(vectorId as string);
        });
        
        const afterCount = this.storage.memoryVectors.length;
        console.debug(
            `Removed ${beforeCount - afterCount} vectors from storage ` +
            `(before: ${beforeCount}, after: ${afterCount})`
        );
    }

    /**
     * Removes IDs from the index
     */
    private removeIdsFromIndex(idsToRemove: string[]): void {
        idsToRemove.forEach(id => this.index.delete(id));
        console.debug(`Removed ${idsToRemove.length} IDs from index`);
    }

    /**
     * Removes file basename from index if present
     */
    private removeFileBasenameFromIndex(basename: string): void {
        if (this.index.has(basename)) {
            this.index.delete(basename);
            console.debug(`Removed file basename ${basename} from index`);
        }
    }

    /**
     * Creates embeddings for all chunks in a file
     */
    async createEmbeddingForFile(file: TFile): Promise<void> {
        const text = await this.app.vault.cachedRead(file);
        const chunks = await this.splitTextIntoChunks(text);
        
        for (let i = 0; i < chunks.length; i++) {
            const embedding = await this.createEmbeddingForChunk(chunks[i]);
            
            if (embedding.length > 0) {
                await this.addChunkToStorage(file.basename, chunks[i], embedding, i);
            }
            
            // Add delay before processing next chunk (except for the last one)
            if (i < chunks.length - 1) {
                await this.sleep(EMBEDDING_CONFIG.DELAY_BETWEEN_CHUNKS_MS);
            }
        }
    }

    /**
     * Adds a chunk to the vector storage and index
     */
    private async addChunkToStorage(
        basename: string,
        chunk: string,
        embedding: number[],
        index: number
    ): Promise<void> {
        const id = `${basename}-${index}`;
        const document: Document = {
            pageContent: chunk,
            metadata: {
                id: id,
                file: basename
            }
        };
        
        await this.storage.addVectors([embedding], [document]);
        this.index.add(id);
        this.index.add(basename);
    }

    /**
     * Generic error handler
     */
    private handleError(error: unknown, context: string): void {
        if (error instanceof Error) {
            console.error(`${context}: ${error.message}`);
        } else {
            console.error(`${context}:`, error);
        }
    }
}