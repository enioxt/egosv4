/**
 * Cortex REST API Server
 * 
 * Standalone HTTP API for Cortex, usable by any application.
 * Runs on port 3008 by default.
 * 
 * Endpoints:
 *   GET  /health          - Health check
 *   GET  /status          - Cortex status
 *   GET  /insights        - List insights (with filters)
 *   GET  /insights/:id    - Get single insight
 *   GET  /search          - Search insights
 *   GET  /files           - List indexed files
 *   POST /ingest          - Manually trigger file ingestion
 * 
 * Usage:
 *   npx tsx apps/dashboard_ideas/cortex/src/api/server.ts
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { getPrisma, getSqlite } from '../lib/db.js';
import { loadConfig } from '../lib/config.js';

const PORT = parseInt(process.env.CORTEX_API_PORT || '3008');

// CORS headers
function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// JSON response helper
function json(res: ServerResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Error response helper
function error(res: ServerResponse, message: string, status = 500) {
  json(res, { error: message, timestamp: new Date().toISOString() }, status);
}

// Parse query string
function parseQuery(url: string): Record<string, string> {
  const parsed = parseUrl(url, true);
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.query)) {
    if (typeof value === 'string') {
      query[key] = value;
    }
  }
  return query;
}

async function main() {
  console.log('🚀 Starting Cortex REST API Server...');
  
  const config = await loadConfig();
  const prisma = getPrisma(config);
  const sqlite = getSqlite(config);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || '/';
    const method = req.method || 'GET';
    const path = parseUrl(url).pathname || '/';
    const query = parseQuery(url);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Health check
      if (path === '/health') {
        json(res, { 
          status: 'healthy', 
          service: 'cortex-api',
          version: '1.0.0',
          timestamp: new Date().toISOString() 
        });
        return;
      }

      // Status
      if (path === '/status') {
        const [insightCount, fileCount] = await Promise.all([
          prisma.insight.count(),
          prisma.sourceFile.count(),
        ]);
        
        json(res, {
          status: 'available',
          database: config.dataDir,
          metrics: {
            insights: insightCount,
            files: fileCount,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // List insights
      if (path === '/insights' && method === 'GET') {
        const limit = parseInt(query.limit || '30');
        const offset = parseInt(query.offset || '0');
        const lens = query.lens;
        const category = query.category;

        const where: Record<string, unknown> = {};
        if (lens) where.lens = lens;
        if (category) where.category = category;

        const [insights, total] = await Promise.all([
          prisma.insight.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: { sourceFile: true },
          }),
          prisma.insight.count({ where }),
        ]);

        json(res, {
          insights: insights.map(i => ({
            id: i.id,
            title: i.title,
            content: i.content.slice(0, 300) + (i.content.length > 300 ? '...' : ''),
            category: i.category,
            lens: i.lens,
            confidence: i.confidence,
            source: i.sourceFile?.path || null,
            createdAt: i.createdAt,
          })),
          total,
          limit,
          offset,
          hasMore: offset + insights.length < total,
        });
        return;
      }

      // Get single insight
      if (path.startsWith('/insights/') && method === 'GET') {
        const id = path.replace('/insights/', '');
        const insight = await prisma.insight.findUnique({
          where: { id },
          include: { sourceFile: true },
        });

        if (!insight) {
          error(res, 'Insight not found', 404);
          return;
        }

        json(res, {
          id: insight.id,
          title: insight.title,
          content: insight.content,
          category: insight.category,
          lens: insight.lens,
          confidence: insight.confidence,
          metadata: insight.metadata ? JSON.parse(insight.metadata) : null,
          source: insight.sourceFile?.path || null,
          createdAt: insight.createdAt,
          updatedAt: insight.updatedAt,
        });
        return;
      }

      // Search insights
      if (path === '/search' && method === 'GET') {
        const q = query.q;
        const limit = parseInt(query.limit || '10');

        if (!q) {
          error(res, 'Query parameter "q" is required', 400);
          return;
        }

        // Text search (for now, semantic search requires embedding)
        const insights = await prisma.insight.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { content: { contains: q } },
            ],
          },
          take: limit,
          orderBy: { confidence: 'desc' },
          include: { sourceFile: true },
        });

        json(res, {
          query: q,
          results: insights.map(i => ({
            id: i.id,
            title: i.title,
            content: i.content.slice(0, 200) + '...',
            category: i.category,
            lens: i.lens,
            confidence: i.confidence,
            source: i.sourceFile?.path || null,
          })),
          count: insights.length,
        });
        return;
      }

      // List files
      if (path === '/files' && method === 'GET') {
        const status = query.status;
        const limit = parseInt(query.limit || '50');

        const where = status ? { status } : {};
        const files = await prisma.sourceFile.findMany({
          where,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: { _count: { select: { insights: true } } },
        });

        json(res, {
          files: files.map(f => ({
            id: f.id,
            path: f.path,
            status: f.status,
            lens: f.lens,
            insightCount: f._count.insights,
            updatedAt: f.updatedAt,
          })),
          count: files.length,
        });
        return;
      }

      // 404 for unknown routes
      error(res, `Unknown endpoint: ${method} ${path}`, 404);

    } catch (err) {
      console.error('API Error:', err);
      error(res, (err as Error).message);
    }
  });

  server.listen(PORT, () => {
    console.log(`✅ Cortex REST API running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /status');
    console.log('  GET  /insights');
    console.log('  GET  /insights/:id');
    console.log('  GET  /search?q=...');
    console.log('  GET  /files');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close();
    process.exit(0);
  });
}

main().catch(console.error);
