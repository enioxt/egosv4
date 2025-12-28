export { LLMBridge, LLMError, estimateTokens } from './llm-bridge.js';
export type { LLMRequest, LLMResponse, LLMProvider } from './llm-bridge.js';

export { loadConfig, ensureConfigDir, ensureDataDir, getDbPath } from './config.js';
export type { CortexConfig, WatchSource } from './config.js';

export { WatcherManager } from './watcher.js';
export type { FileEvent } from './watcher.js';

export { AnalyzerService } from './analyzer.js';
export type { ExtractedInsight } from './analyzer.js';

export { scanForSecrets, redactSecrets, redactPII, sanitizeContent } from './privacy.js';
export type { SecretFinding, PIIConfig } from './privacy.js';

export {
  getPrisma,
  getSqlite,
  saveEmbedding,
  searchSimilar,
  deleteEmbedding,
  vacuumVectors,
  closeDatabases,
} from './db.js';
