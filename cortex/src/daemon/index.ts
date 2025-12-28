import { loadConfig, type CortexConfig } from '../lib/config.js';
import { WatcherManager, type FileEvent } from '../lib/watcher.js';
import { AnalyzerService } from '../lib/analyzer.js';
import { getPrisma, getSqlite, saveEmbedding, closeDatabases } from '../lib/db.js';
import { initDedupTable, deepFingerprint, isDuplicate, hasChanged, saveFileHash, removeFileHash } from '../lib/dedup.js';
import type { PrismaClient } from '@prisma/client';
import type Database from 'better-sqlite3';

class CortexDaemon {
  private config!: CortexConfig;
  private watcher!: WatcherManager;
  private analyzer!: AnalyzerService;
  private prisma!: PrismaClient;
  private sqlite!: Database.Database;
  private processing = new Set<string>();
  private shutdownRequested = false;

  async start(): Promise<void> {
    console.log('🧠 Starting Cortex daemon...');

    // Load configuration
    this.config = await loadConfig();
    console.log(`📁 Data directory: ${this.config.dataDir}`);

    // Initialize services
    this.prisma = getPrisma(this.config);
    this.sqlite = getSqlite(this.config);
    this.analyzer = new AnalyzerService(this.config);
    this.watcher = new WatcherManager();

    // Initialize deduplication table
    initDedupTable(this.sqlite);

    // Setup event handlers
    this.watcher.on('file', (event: FileEvent) => this.handleFileEvent(event));
    this.watcher.on('error', (error: Error) => console.error('Watcher error:', error));
    this.watcher.on('ready', (source) => console.log(`👁️ Watching: ${source.path}`));

    // Start watching
    await this.watcher.reload(this.config.watchSources);

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    console.log('✅ Cortex daemon started');
    console.log(`📊 Watching ${this.config.watchSources.length} sources`);
  }

  private async handleFileEvent(event: FileEvent): Promise<void> {
    const { type, path, source } = event;

    // Skip if already processing
    if (this.processing.has(path)) {
      return;
    }

    console.log(`📄 ${type}: ${path}`);

    if (type === 'unlink') {
      await this.handleDelete(path);
      return;
    }

    // Add to processing set
    this.processing.add(path);

    try {
      await this.processFile(path, source.id, source.lens);
    } catch (error) {
      console.error(`Error processing ${path}:`, error);
      await this.prisma.sourceFile.upsert({
        where: { path },
        update: { status: 'error', error: String(error) },
        create: {
          path,
          sourceId: source.id,
          lens: source.lens,
          status: 'error',
          error: String(error),
        },
      });
    } finally {
      this.processing.delete(path);
    }
  }

  private async processFile(
    path: string,
    sourceId: string,
    lens: string
  ): Promise<void> {
    // Deduplication check
    const fingerprint = await deepFingerprint(path);
    
    // Check if content unchanged since last index
    if (!hasChanged(this.sqlite, path, fingerprint.hash)) {
      console.log(`⏭️ Skipping (unchanged): ${path}`);
      return;
    }
    
    // Check if identical content exists elsewhere
    if (isDuplicate(this.sqlite, fingerprint.hash, path)) {
      console.log(`🔄 Duplicate content detected: ${path}`);
      // Still index, but mark as duplicate in metadata
    }

    // Upsert source file
    const sourceFile = await this.prisma.sourceFile.upsert({
      where: { path },
      update: { status: 'processing', sourceId, lens },
      create: { path, sourceId, lens, status: 'processing' },
    });

    // Analyze file
    const insights = await this.analyzer.analyzeFile(path, {
      id: sourceId,
      path,
      lens: lens as 'philosopher' | 'architect' | 'somatic' | 'analyst' | 'general',
      recursive: true,
      extensions: [],
    });

    if (insights.length === 0) {
      await this.prisma.sourceFile.update({
        where: { id: sourceFile.id },
        data: { status: 'indexed' },
      });
      return;
    }

    // Save insights
    for (const insight of insights) {
      const saved = await this.prisma.insight.create({
        data: {
          title: insight.title,
          content: insight.content,
          category: insight.category,
          lens,
          confidence: insight.confidence,
          metadata: JSON.stringify({
            tags: insight.tags,
            relatedConcepts: insight.relatedConcepts,
          }),
          sourceFileId: sourceFile.id,
        },
      });

      // Generate and save embedding
      const embeddingText = `${insight.title}\n${insight.content}`;
      const embedding = await this.analyzer.generateEmbedding(embeddingText);
      await saveEmbedding(this.sqlite, saved.id, embedding);

      console.log(`💡 Insight: ${insight.title}`);
    }

    // Update source file status
    await this.prisma.sourceFile.update({
      where: { id: sourceFile.id },
      data: { status: 'indexed' },
    });

    // Save file hash for deduplication
    saveFileHash(this.sqlite, fingerprint);
    console.log(`✅ Indexed: ${path}`);
  }

  private async handleDelete(path: string): Promise<void> {
    const sourceFile = await this.prisma.sourceFile.findUnique({
      where: { path },
      include: { insights: true },
    });

    if (sourceFile) {
      // Delete embeddings
      for (const insight of sourceFile.insights) {
        this.sqlite.prepare('DELETE FROM vec_insights WHERE id = ?').run(insight.id);
      }

      // Delete source file (cascades to insights)
      await this.prisma.sourceFile.delete({ where: { id: sourceFile.id } });
      
      // Remove file hash
      removeFileHash(this.sqlite, path);
      console.log(`🗑️ Deleted: ${path}`);
    }
  }

  private async shutdown(): Promise<void> {
    if (this.shutdownRequested) return;
    this.shutdownRequested = true;

    console.log('\n🛑 Shutting down Cortex daemon...');

    // Stop watching
    await this.watcher.shutdown();

    // Wait for pending processing
    while (this.processing.size > 0) {
      console.log(`⏳ Waiting for ${this.processing.size} files to finish...`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Close databases
    await closeDatabases();

    console.log('👋 Cortex daemon stopped');
    process.exit(0);
  }
}

const daemon = new CortexDaemon();
daemon.start().catch((error) => {
  console.error('Failed to start daemon:', error);
  process.exit(1);
});
