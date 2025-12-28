import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { stat } from 'fs/promises';
import { extname } from 'path';
import type { WatchSource } from './config.js';

export interface FileEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  source: WatchSource;
  inode?: number;
  size?: number;
  mtime?: Date;
}

export class WatcherManager extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();

  async addSource(source: WatchSource): Promise<void> {
    if (this.watchers.has(source.id)) {
      await this.removeSource(source.id);
    }

    const watcher = chokidar.watch(source.path, {
      persistent: true,
      ignoreInitial: false,
      usePolling: false,
      interval: 100,
      binaryInterval: 300,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      ignored: [
        /(^|[\/\\])\../, // Hidden files
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        ...(source.ignore || []),
      ],
      depth: source.recursive ? undefined : 0,
    });

    watcher
      .on('add', (path) => this.handleEvent('add', path, source))
      .on('change', (path) => this.handleEvent('change', path, source))
      .on('unlink', (path) => this.handleEvent('unlink', path, source))
      .on('error', (error) => this.emit('error', error, source))
      .on('ready', () => this.emit('ready', source));

    this.watchers.set(source.id, watcher);
  }

  private async handleEvent(
    type: 'add' | 'change' | 'unlink',
    path: string,
    source: WatchSource
  ): Promise<void> {
    // Filter by extension if specified
    if (source.extensions.length > 0) {
      const ext = extname(path).toLowerCase();
      if (!source.extensions.includes(ext)) {
        return;
      }
    }

    const event: FileEvent = { type, path, source };

    // Get file metadata for add/change events
    if (type !== 'unlink') {
      try {
        const stats = await stat(path);
        event.inode = stats.ino;
        event.size = stats.size;
        event.mtime = stats.mtime;
      } catch {
        // File may have been deleted between event and stat
        return;
      }
    }

    this.emit('file', event);
  }

  async removeSource(id: string): Promise<void> {
    const watcher = this.watchers.get(id);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(id);
    }
  }

  async reload(sources: WatchSource[]): Promise<void> {
    const currentIds = new Set(this.watchers.keys());
    const newIds = new Set(sources.map((s) => s.id));

    // Remove deleted sources
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        await this.removeSource(id);
      }
    }

    // Add/update sources
    for (const source of sources) {
      await this.addSource(source);
    }
  }

  async shutdown(): Promise<void> {
    for (const [id] of this.watchers) {
      await this.removeSource(id);
    }
  }

  getActiveWatchers(): string[] {
    return Array.from(this.watchers.keys());
  }
}
