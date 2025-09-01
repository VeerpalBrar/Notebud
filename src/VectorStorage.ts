import NoteBud from "main";
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { App} from 'obsidian';
import type { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChunkData } from './types';

export class VectorStorage {
    plugin: NoteBud;
    app: App;
    storage: MemoryVectorStore;
    embeddings: OpenAIEmbeddings;

    constructor(app: App, plugin: NoteBud, settings: NoteBud['settings']) {
        this.plugin = plugin;
        this.app = app;

        this.embeddings = new OpenAIEmbeddings({
            model: settings.embeddingModel,
            apiKey: settings.apiKey,
            configuration: {
                baseURL: settings.modelUrl,
                dangerouslyAllowBrowser: true
            }
        });
        
        this.storage = new MemoryVectorStore(this.embeddings);

        this.load();
    }

    async search(text: string, count=10) {
        const embeddings = await this.createEmbeddingsWithDelay(text);
        console.debug("done creating embeddings");
        // Search for similar documents using each embedding and combine results
        const allResults = [];
        for (const embedding of embeddings) {
            const results = await this.storage.similaritySearchVectorWithScore(embedding, count);
            allResults.push(...results);
        }
        console.debug("finished searching");
        
        // Sort by similarity score and remove duplicates
        const uniqueResults = new Map();
        allResults
            .sort((a, b) => b[1] - a[1]) // Sort by score descending
            .forEach(([doc, score]) => {
                const key = doc.metadata.id;
                if (!uniqueResults.has(key)) {
                    uniqueResults.set(key, { doc, score });
                }
            });
        
        // Return top results
        return Array.from(uniqueResults.values())
            .slice(0, count)
            .map(({ doc }) => ({
                content: doc.pageContent, 
                id: doc.metadata.id, 
                filename: doc.metadata.file
            } as ChunkData));
    }

    async load() {
        const data = await this.app.vault.adapter.read('.obsidian/plugins/obsidian-sample-plugin/data/embeddings.json')
        const obj = JSON.parse(data)
        const embeddings = [] as number[][];
        const documents = [] as Document[];
        obj.forEach((chunk: any) => {
            embeddings.push(chunk["embedding"])
            documents.push({pageContent: chunk["content"], metadata: { id: chunk["metadata"]["id"], file: chunk["metadata"]["file"]}})
        })
        await this.storage.addVectors(embeddings, documents)
    }

    async createEmbeddingsWithDelay(text: string) {
        // Split the text into chunks if it's too long
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 500,
            separators: ["\n\n", "\n", " ", ""]
        });
        
        const chunks = await textSplitter.splitText(text);

        console.debug("done splitting text into ${chunks.length} chunks", chunks.length);
        
        // Helper function to add delay
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Create embeddings for all chunks using LangChain embeddings
        const embeddings = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.debug("creating embedding for chunk", i, "of", chunks.length);
            
            // Create a timeout promise that rejects after 15 seconds
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Embedding request timed out after 15 seconds')), 15000);
            });
            
            // Race between the embedding request and the timeout
            const embedding = await Promise.race([
                this.embeddings.embedQuery(chunk),
                timeoutPromise
            ]).then((res: number[]) => res).catch(err => {
                console.error(`Error creating embedding for chunk ${i}:`, err);
                return [] as number[];
            });
            
            if (embedding.length > 0) {
                embeddings.push(embedding);
            }
            console.debug("done creating embedding for chunk", i);
            // wait 16 seconds for the next chunk
            if (i < chunks.length - 1) {
                console.debug("sleeping", i, chunk.length - 1)
                await sleep(16 * 1000);
            }
        }
        return embeddings;
    }
}