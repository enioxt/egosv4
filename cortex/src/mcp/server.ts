/**
 * Cortex MCP Server
 * 
 * Exposes Cortex functionality as MCP tools:
 * - cortex_search: Semantic search in knowledge base
 * - cortex_ask: Ask questions using LLM + context
 * - cortex_status: Get daemon and index status
 * - cortex_ingest: Manually trigger file ingestion
 * 
 * Usage:
 *   npx tsx apps/dashboard_ideas/cortex/src/mcp/server.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

// Cortex data paths
const CORTEX_DATA_DIR = join(homedir(), ".local", "share", "cortex");
const CORTEX_DB_PATH = join(CORTEX_DATA_DIR, "cortex.db");

// Initialize databases
let prisma: PrismaClient | null = null;
let sqlite: Database.Database | null = null;

function initDatabases() {
  if (!existsSync(CORTEX_DB_PATH)) {
    console.error(`⚠️ Cortex database not found at ${CORTEX_DB_PATH}`);
    return false;
  }

  process.env.DATABASE_URL = `file:${CORTEX_DB_PATH}`;
  prisma = new PrismaClient();
  sqlite = new Database(CORTEX_DB_PATH, { readonly: true });
  return true;
}

// Cosine similarity for vector search
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Create MCP server
const server = new McpServer({
  name: "cortex-mcp",
  version: "1.0.0"
});

// Tool: cortex_status - Get Cortex system status
server.tool(
  "cortex_status",
  "Returns Cortex system status including indexed files and insights count",
  {},
  async () => {
    try {
      if (!prisma) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ status: "not_initialized", message: "Cortex database not found" })
          }]
        };
      }

      const [sourceFiles, insights] = await Promise.all([
        prisma.sourceFile.count(),
        prisma.insight.count()
      ]);

      const vectorCount = sqlite?.prepare("SELECT COUNT(*) as count FROM vec_insights").get() as { count: number } | undefined;

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: "healthy",
            database: CORTEX_DB_PATH,
            metrics: {
              indexed_files: sourceFiles,
              insights: insights,
              embeddings: vectorCount?.count || 0
            },
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cortex_search - Semantic search in knowledge base
server.tool(
  "cortex_search",
  "Search Cortex knowledge base using semantic similarity. Returns relevant insights.",
  {
    query: z.string().describe("Search query"),
    limit: z.number().optional().default(5).describe("Max results (default 5)")
  },
  async ({ query, limit }) => {
    try {
      if (!prisma || !sqlite) {
        return {
          content: [{ type: "text" as const, text: "Cortex not initialized" }],
          isError: true
        };
      }

      // For now, do text-based search (embedding search requires LLM call)
      const insights = await prisma.insight.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } }
          ]
        },
        take: limit,
        orderBy: { confidence: "desc" },
        include: { sourceFile: true }
      });

      const results = insights.map(i => ({
        id: i.id,
        title: i.title,
        content: i.content.slice(0, 200) + (i.content.length > 200 ? "..." : ""),
        category: i.category,
        confidence: i.confidence,
        source: i.sourceFile?.path || "unknown",
        lens: i.lens
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            query,
            count: results.length,
            results
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cortex_insights - List recent insights
server.tool(
  "cortex_insights",
  "List recent insights from Cortex knowledge base",
  {
    category: z.string().optional().describe("Filter by category (knowledge, pattern, observation, idea, reference)"),
    lens: z.string().optional().describe("Filter by lens (philosopher, architect, somatic, analyst, general)"),
    limit: z.number().optional().default(10).describe("Max results (default 10)")
  },
  async ({ category, lens, limit }) => {
    try {
      if (!prisma) {
        return {
          content: [{ type: "text" as const, text: "Cortex not initialized" }],
          isError: true
        };
      }

      const where: Record<string, string> = {};
      if (category) where.category = category;
      if (lens) where.lens = lens;

      const insights = await prisma.insight.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { sourceFile: true }
      });

      const results = insights.map(i => ({
        id: i.id,
        title: i.title,
        category: i.category,
        lens: i.lens,
        confidence: i.confidence,
        source: i.sourceFile?.path || "unknown",
        createdAt: i.createdAt
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            filters: { category, lens },
            count: results.length,
            results
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cortex_files - List indexed files
server.tool(
  "cortex_files",
  "List files indexed by Cortex",
  {
    status: z.enum(["indexed", "processing", "error"]).optional().describe("Filter by status"),
    limit: z.number().optional().default(20).describe("Max results (default 20)")
  },
  async ({ status, limit }) => {
    try {
      if (!prisma) {
        return {
          content: [{ type: "text" as const, text: "Cortex not initialized" }],
          isError: true
        };
      }

      const where = status ? { status } : {};
      const files = await prisma.sourceFile.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { insights: true } } }
      });

      const results = files.map(f => ({
        id: f.id,
        path: f.path,
        status: f.status,
        lens: f.lens,
        insights_count: f._count.insights,
        error: f.error || undefined,
        updatedAt: f.updatedAt
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            filter: { status },
            count: results.length,
            results
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true
      };
    }
  }
);

// Main entry point
async function main() {
  console.error("🧠 Starting Cortex MCP Server...");
  console.error(`   Version: 1.0.0`);
  console.error(`   Data Dir: ${CORTEX_DATA_DIR}`);
  
  const dbInitialized = initDatabases();
  if (!dbInitialized) {
    console.error("⚠️ Running in limited mode (no database)");
  } else {
    console.error("✅ Database connected");
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("✅ Cortex MCP Server connected via stdio");
}

main().catch(console.error);
