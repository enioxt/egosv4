import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import type Database from 'better-sqlite3';

export interface FileFingerprint {
  path: string;
  hash: string;
  size: number;
  mtime: Date;
}

/**
 * Generates SHA256 hash of file content
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Quick fingerprint using inode + size + mtime (fast, but not content-based)
 */
export async function quickFingerprint(filePath: string): Promise<FileFingerprint> {
  const stats = await stat(filePath);
  const hash = createHash('sha256')
    .update(`${stats.ino}:${stats.size}:${stats.mtimeMs}`)
    .digest('hex');
  
  return {
    path: filePath,
    hash,
    size: stats.size,
    mtime: stats.mtime,
  };
}

/**
 * Deep fingerprint using actual file content (slower, but detects identical content)
 */
export async function deepFingerprint(filePath: string): Promise<FileFingerprint> {
  const [stats, contentHash] = await Promise.all([
    stat(filePath),
    hashFile(filePath),
  ]);
  
  return {
    path: filePath,
    hash: contentHash,
    size: stats.size,
    mtime: stats.mtime,
  };
}

/**
 * Initialize deduplication table in SQLite
 */
export function initDedupTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_hashes (
      path TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      size INTEGER NOT NULL,
      mtime TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_file_hashes_content ON file_hashes(content_hash)
  `);
}

/**
 * Check if file content already exists (by hash)
 */
export function isDuplicate(db: Database.Database, contentHash: string, excludePath?: string): boolean {
  const stmt = excludePath
    ? db.prepare('SELECT 1 FROM file_hashes WHERE content_hash = ? AND path != ? LIMIT 1')
    : db.prepare('SELECT 1 FROM file_hashes WHERE content_hash = ? LIMIT 1');
  
  const result = excludePath
    ? stmt.get(contentHash, excludePath)
    : stmt.get(contentHash);
  
  return !!result;
}

/**
 * Check if file has been modified since last indexing
 */
export function hasChanged(db: Database.Database, filePath: string, currentHash: string): boolean {
  const stmt = db.prepare('SELECT content_hash FROM file_hashes WHERE path = ?');
  const row = stmt.get(filePath) as { content_hash: string } | undefined;
  
  if (!row) return true; // New file
  return row.content_hash !== currentHash;
}

/**
 * Save file hash after indexing
 */
export function saveFileHash(
  db: Database.Database,
  fingerprint: FileFingerprint
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO file_hashes (path, content_hash, size, mtime, indexed_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    fingerprint.path,
    fingerprint.hash,
    fingerprint.size,
    fingerprint.mtime.toISOString(),
    new Date().toISOString()
  );
}

/**
 * Remove file hash when file is deleted
 */
export function removeFileHash(db: Database.Database, filePath: string): void {
  db.prepare('DELETE FROM file_hashes WHERE path = ?').run(filePath);
}

/**
 * Get all paths with same content hash (find duplicates)
 */
export function findDuplicates(db: Database.Database, contentHash: string): string[] {
  const stmt = db.prepare('SELECT path FROM file_hashes WHERE content_hash = ?');
  const rows = stmt.all(contentHash) as Array<{ path: string }>;
  return rows.map(r => r.path);
}
