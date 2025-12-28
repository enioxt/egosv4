import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { getDbPath, type CortexConfig } from './config.js';

let prismaInstance: PrismaClient | null = null;
let sqliteInstance: Database.Database | null = null;

export function getPrisma(config: CortexConfig): PrismaClient {
  if (!prismaInstance) {
    const dbPath = getDbPath(config);
    process.env.DATABASE_URL = `file:${dbPath}`;
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export function getSqlite(config: CortexConfig): Database.Database {
  if (!sqliteInstance) {
    const dbPath = getDbPath(config);
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma('journal_mode = WAL');
    
    // Initialize vector table
    initVectorTable(sqliteInstance);
  }
  return sqliteInstance;
}

function initVectorTable(db: Database.Database): void {
  // Create vector table for embeddings
  // Using 1536 dimensions for text-embedding-3-small
  db.exec(`
    CREATE TABLE IF NOT EXISTS vec_insights (
      id TEXT PRIMARY KEY,
      embedding BLOB NOT NULL
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vec_insights_id ON vec_insights(id)
  `);
}

export async function saveEmbedding(
  db: Database.Database,
  insightId: string,
  embedding: number[]
): Promise<void> {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO vec_insights(id, embedding)
    VALUES (?, ?)
  `);
  
  // Store as Float32Array buffer for efficiency
  const buffer = Buffer.from(new Float32Array(embedding).buffer);
  stmt.run(insightId, buffer);
}

export async function searchSimilar(
  db: Database.Database,
  queryEmbedding: number[],
  limit: number = 10
): Promise<Array<{ id: string; score: number }>> {
  const queryBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);
  
  // Get all embeddings and compute cosine similarity
  const rows = db.prepare(`
    SELECT id, embedding FROM vec_insights
  `).all() as Array<{ id: string; embedding: Buffer }>;
  
  const results = rows.map((row) => {
    const stored = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.length / 4);
    const query = new Float32Array(queryBuffer.buffer, queryBuffer.byteOffset, queryBuffer.length / 4);
    const score = cosineSimilarity(query, stored);
    return { id: row.id, score };
  });
  
  // Sort by similarity (descending) and take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export async function deleteEmbedding(
  db: Database.Database,
  insightId: string
): Promise<void> {
  db.prepare('DELETE FROM vec_insights WHERE id = ?').run(insightId);
}

export async function vacuumVectors(db: Database.Database, prisma: PrismaClient): Promise<number> {
  // Remove orphaned vectors (no matching insight)
  const insights = await prisma.insight.findMany({ select: { id: true } });
  const validIds = new Set(insights.map((i) => i.id));
  
  const vectors = db.prepare('SELECT id FROM vec_insights').all() as Array<{ id: string }>;
  let deleted = 0;
  
  for (const { id } of vectors) {
    if (!validIds.has(id)) {
      db.prepare('DELETE FROM vec_insights WHERE id = ?').run(id);
      deleted++;
    }
  }
  
  if (deleted > 0) {
    db.exec('VACUUM');
  }
  
  return deleted;
}

export async function closeDatabases(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
}
