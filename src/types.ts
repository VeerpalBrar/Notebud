export interface NoteBudSettings {
	apiKey: string;
	embeddingModel: string;
	llmModel: string;
	modelUrl: string;
}

export const DEFAULT_SETTINGS: NoteBudSettings = {
	apiKey: '',
	embeddingModel: 'openai/text-embedding-3-small',
	llmModel: 'gpt-4o-mini',
	modelUrl: 'https://models.github.ai/inference'
};

export interface ChunkData {
	id: string;
	content: string;
	file: string; // filename for the file this chunk belongs to
	embedding?: number[]; // optional embedding vector
}

export interface ConnectionOutput {
	editorial: string[];
	connections: Array<{
		source_id: string;
		connection: string;
	}>;
}
