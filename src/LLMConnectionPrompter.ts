import NoteBud from "main";
import { App } from 'obsidian';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChunkData, ConnectionOutput } from "./types";

const SYSTEM_MESSAGE = `
You are a helpful research assistant that helps improve markdown documents. You will be provided a markdown document in the following JSON format:

{
  "document": "markdown document",
  "sources": [
    {
      "source_id": "source_id_1",
      "content": "content of source 1."
    },
    {
      "source_id": "source_id_2",
      "content": "content of source 2"
    }
  ]
}

You must provide feedback in two forms:

1. **Editorial Feedback**  
   As an editor, provide feedback on the content between "START Document" and "END Document":
   - Point out spelling or grammar errors.
   - Suggest sentences that can be rewritten to be more concise.
   - Identify sentences that use passive voice.
   Be as concise as possible in your editorial feedback and limit your feedback to a maximum of 3 points and a maximum of 50 tokens.

2. **Connections to Sources**  
   Create connections between the document and additional information or research. You will be provided a data set of other sources that could potentially relate to the markdown document.  
   The sources are contained in the content between "START Sources" and "END Sources". The sources are in the format:  
   - <source_id>: <source_text>
   
   To create connections:
   - Pull out information from the source_text and connect it to the markdown document.
   - Do not provide any info that is not in source_text.
   - For each connection, return the <source_id> of the source it's connected to.
   - The source content might have references to links or documents. These should not be used as a source_id.
   - The source_id in the returned connections must match the input source_id.
   - Limit yourself to 3 connections and a maximum of 300 tokens.

{format_instructions}

**Example Input:**
{
  "document": "Critical thinking is a skill vitals to success in life as instead of just memorizing information, you are able to think critically about the information and apply it to your own life.",
  "sources": [
    {
      "source_id": "Journalling for clarity",
      "content": "When you journal, you are writing down your thoughts. This helps you to empty your mind and clarify your thoughts and feelings to finally let go of them."
    },
    {
      "source_id": "Teach thinking by teaching writing",
      "content": "If you want to teach someone to think, you should teach them to write. For writing and thinking are the same and being able to articulate your writing forces you to think more deeply about what you are trying to convey to the reader."
    },
    {
      "source_id": "Don't copy the slides",
      "content": "To be a successful student, instead of mindlessly copying the slides, try to understand the material and then write your own notes."
    }
  ]
}

**Example Output:**
{
  "editorial": ["vitals should be vital"],
  "connections": [
    {
      "source_id": "Journalling for clarity",
      "connection": "Similar to the idea of journalling for clarity, you can use writing to help you think more clearly."
    },
    {
      "source_id": "Teach thinking by teaching writing",
      "connection": "If you want to think clearly, you should learn to write better so you are able catch flaws in your thinking."
    },
    {
      "source_id": "Don't copy the slides",
      "connection": "Similar to how students are told to write notes in their own words, you should write your own notes to help you think more clearly."
    }
  ]
}
`;

export class LLMConnectionPrompter {
    plugin: NoteBud;
    app: App;
    private llm: ChatOpenAI;


    constructor(app: App, plugin: NoteBud, settings: NoteBud['settings']) {
        this.plugin = plugin;
        this.app = app;
        
        // Initialize the LLM with the same configuration as VectorStorage
        this.llm = new ChatOpenAI({
            model: settings.llmModel,
            temperature: 0.3,
            configuration: {
                apiKey: settings.apiKey,
                baseURL: settings.modelUrl,
                dangerouslyAllowBrowser: true
            }
        });
    }

    async generateConnections(fileContent: string, sources: ChunkData[]): Promise<ConnectionOutput> {
        // Set up the JSON output parser
        const parser = new JsonOutputParser<ConnectionOutput>();
        
        // Create the prompt template with format instructions
        const promptTemplate = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_MESSAGE],
            ["user", '{{"document": "{{ {document} }}", "sources": [ {sources} ]}}']
        ]);

        console.log("Sources received:", sources);
        console.log("Number of sources:", sources.length);
        
        if (sources.length === 0) {
            console.warn("No sources found, returning empty result");
            return {
                editorial: [],
                connections: []
            };
        }
    
        // Format sources for the prompt with dashes
        const formattedSources = sources.map(source => {
            if (!source.id || !source.content) {
                console.warn("Invalid source structure:", source);
                return null;
            }
            return `{ "source_id": "${source.id}", content:"${source.content}" },`;
        }).filter(Boolean).join('\n');

        // Create the chain with parser
        const chain = promptTemplate.pipe(this.llm).pipe(parser);

        // Invoke the chain
        const response = await chain.invoke({
            document: fileContent,
            sources: formattedSources,
            format_instructions: parser.getFormatInstructions()
        });

        return response;
    }
}