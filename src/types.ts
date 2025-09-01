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
	filename: string;
	id: string;
	content: string;
}

export interface ConnectionOutput {
	editorial: string[];
	connections: Array<{
		source_id: string;
		connection: string;
	}>;
}
