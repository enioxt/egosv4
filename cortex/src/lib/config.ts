import { z } from 'zod';
import { cosmiconfig } from 'cosmiconfig';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const WatchSourceSchema = z.object({
  id: z.string(),
  path: z.string(),
  lens: z.enum(['philosopher', 'architect', 'somatic', 'analyst', 'general']),
  recursive: z.boolean().default(true),
  extensions: z.array(z.string()).default([]),
  ignore: z.array(z.string()).optional(),
});

const PrivacySchema = z.object({
  redactSecrets: z.boolean().default(true),
  redactPII: z.boolean().default(false),
  piiConfig: z
    .object({
      emails: z.boolean().default(false),
      phones: z.boolean().default(false),
      ips: z.boolean().default(false),
      financial: z.boolean().default(false),
    })
    .optional(),
});

const LLMSchema = z.object({
  provider: z.enum(['openrouter', 'ollama']).default('openrouter'),
  openrouterApiKey: z.string().optional(),
  ollamaHost: z.string().default('http://127.0.0.1:11434'),
  model: z.string().default('google/gemini-2.0-flash-001'),
  embeddingModel: z.string().default('openai/text-embedding-3-small'),
});

const CortexConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  dataDir: z.string().default('~/.local/share/cortex'),
  watchSources: z.array(WatchSourceSchema).default([]),
  privacy: PrivacySchema.default({}),
  llm: LLMSchema.default({}),
  queue: z
    .object({
      concurrency: z.number().default(2),
      maxRetries: z.number().default(3),
    })
    .default({}),
});

export type CortexConfig = z.infer<typeof CortexConfigSchema>;
export type WatchSource = z.infer<typeof WatchSourceSchema>;

const CONFIG_DIR = join(homedir(), '.config', 'cortex');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: CortexConfig = {
  version: '1.0.0',
  dataDir: join(homedir(), '.local', 'share', 'cortex'),
  watchSources: [
    {
      id: 'documents',
      path: join(homedir(), 'Documents'),
      lens: 'general',
      recursive: true,
      extensions: ['.md', '.txt', '.pdf'],
    },
    {
      id: 'notes',
      path: join(homedir(), 'Notes'),
      lens: 'philosopher',
      recursive: true,
      extensions: ['.md', '.txt'],
    },
    {
      id: 'chat-exports',
      path: join(homedir(), 'Downloads', 'compiladochats'),
      lens: 'philosopher',
      recursive: false,
      extensions: ['.md', '.txt'],
    },
  ],
  privacy: {
    redactSecrets: true,
    redactPII: false,
  },
  llm: {
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-001',
    embeddingModel: 'openai/text-embedding-3-small',
    ollamaHost: 'http://127.0.0.1:11434',
  },
  queue: {
    concurrency: 2,
    maxRetries: 3,
  },
};

export async function loadConfig(): Promise<CortexConfig> {
  // Check environment variable first
  if (process.env.CORTEX_CONFIG) {
    const envConfig = JSON.parse(process.env.CORTEX_CONFIG);
    return CortexConfigSchema.parse(envConfig);
  }

  // Use cosmiconfig for flexible config loading
  const explorer = cosmiconfig('cortex', {
    searchPlaces: [
      'cortex.config.json',
      '.cortexrc',
      '.cortexrc.json',
      join(CONFIG_DIR, 'config.json'),
    ],
  });

  const result = await explorer.search();

  if (result?.config) {
    return CortexConfigSchema.parse(result.config);
  }

  // Create default config if none exists
  if (!existsSync(CONFIG_FILE)) {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(`Created default config at ${CONFIG_FILE}`);
  }

  return DEFAULT_CONFIG;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function ensureDataDir(config: CortexConfig): string {
  const dataDir = config.dataDir.replace('~', homedir());
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

export function getDbPath(config: CortexConfig): string {
  const dataDir = ensureDataDir(config);
  return join(dataDir, 'cortex.db');
}
