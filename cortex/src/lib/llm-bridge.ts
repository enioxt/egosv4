import OpenAI from 'openai';

export interface LLMRequest {
  system?: string;
  prompt: string;
  temperature?: number;
  jsonMode?: boolean;
}

export interface LLMResponse {
  text: string;
  usage: {
    input: number;
    output: number;
  };
  provider: 'openrouter' | 'ollama';
  model: string;
}

export interface LLMProvider {
  generate(req: LLMRequest): Promise<LLMResponse>;
  embed(text: string): Promise<number[]>;
  isHealthy(): Promise<boolean>;
}

const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';
const OPENROUTER_EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIM = 1536; // text-embedding-3-small dimension

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error('OPENROUTER_API_KEY is required');
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: key,
      defaultHeaders: {
        'HTTP-Referer': 'https://cortex.local',
        'X-Title': 'Cortex Intelligence',
      },
    });
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
        { role: 'user' as const, content: req.prompt },
      ],
      temperature: req.temperature ?? 0.7,
      response_format: req.jsonMode ? { type: 'json_object' } : undefined,
    });

    return {
      text: response.choices[0].message.content ?? '',
      usage: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      provider: 'openrouter',
      model: OPENROUTER_MODEL,
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: OPENROUTER_EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  }

  async *stream(req: LLMRequest): AsyncGenerator<string> {
    const response = await this.client.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
        { role: 'user' as const, content: req.prompt },
      ],
      temperature: req.temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    return !!process.env.OPENROUTER_API_KEY;
  }
}

export class LLMError extends Error {
  constructor(
    message: string,
    public code: 'UNAVAILABLE' | 'TIMEOUT' | 'RATE_LIMITED' | 'API_KEY_MISSING',
    public provider: 'openrouter' | 'ollama'
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err?.status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export class LLMBridge {
  private provider: OpenRouterProvider;

  constructor(apiKey?: string) {
    this.provider = new OpenRouterProvider(apiKey);
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    return withRetry(() => this.provider.generate(req));
  }

  async embed(text: string): Promise<number[]> {
    return withRetry(() => this.provider.embed(text));
  }

  async *stream(req: LLMRequest): AsyncGenerator<string> {
    yield* this.provider.stream(req);
  }

  async isHealthy(): Promise<boolean> {
    return this.provider.isHealthy();
  }

  getEmbeddingDimension(): number {
    return EMBEDDING_DIM;
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
