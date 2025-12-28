import { z } from 'zod';
import { LLMBridge } from './llm-bridge.js';
import { sanitizeContent, type PIIConfig } from './privacy.js';
import { extractorPipeline } from './extractors/pdf.js';
import type { CortexConfig, WatchSource } from './config.js';

const InsightSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.string(),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()).optional(),
  relatedConcepts: z.array(z.string()).optional(),
});

export type ExtractedInsight = z.infer<typeof InsightSchema>;

const LENS_PROMPTS: Record<string, string> = {
  philosopher: `You are a philosophical analyst. Extract deep insights about meaning, purpose, values, and existential themes from this content. Focus on wisdom, life lessons, and philosophical observations.`,
  
  architect: `You are a technical architect. Extract insights about system design, code patterns, architectural decisions, and technical concepts. Focus on structure, patterns, and technical knowledge.`,
  
  somatic: `You are a somatic awareness analyst. Extract insights about physical experiences, health patterns, body awareness, and wellness observations. Focus on physical sensations and health-related knowledge.`,
  
  analyst: `You are a data analyst. Extract insights about patterns, trends, metrics, and analytical observations. Focus on quantifiable insights and data-driven observations.`,
  
  general: `You are a general knowledge analyst. Extract the most important insights, facts, and observations from this content. Focus on actionable knowledge and key takeaways.`,
};

export class AnalyzerService {
  private llm: LLMBridge;
  private config: CortexConfig;

  constructor(config: CortexConfig) {
    this.config = config;
    this.llm = new LLMBridge(config.llm.openrouterApiKey);
  }

  async analyzeFile(
    filePath: string,
    source: WatchSource
  ): Promise<ExtractedInsight[]> {
    // Read file content
    const content = await this.extractText(filePath);
    if (!content.trim()) {
      return [];
    }

    // Sanitize content (remove secrets, optionally PII)
    const { content: sanitized, secretsFound } = sanitizeContent(content, {
      redactSecrets: this.config.privacy.redactSecrets,
      piiConfig: this.config.privacy.piiConfig as PIIConfig | undefined,
    });

    if (secretsFound.length > 0) {
      console.warn(`Found ${secretsFound.length} secrets in ${filePath}, redacted before analysis`);
    }

    // Analyze with LLM
    const insights = await this.extractInsights(sanitized, source.lens);
    return insights;
  }

  private async extractText(filePath: string): Promise<string> {
    // Use ExtractorPipeline which supports: .txt, .md, .json, .yaml, .pdf, etc.
    try {
      return await extractorPipeline.extract(filePath);
    } catch (error) {
      console.warn(`Failed to extract text from ${filePath}:`, error);
      return '';
    }
  }

  private async extractInsights(
    content: string,
    lens: string
  ): Promise<ExtractedInsight[]> {
    const systemPrompt = LENS_PROMPTS[lens] || LENS_PROMPTS.general;

    const prompt = `Analyze the following content and extract 1-3 key insights.

For each insight, provide:
- title: A concise title (max 100 chars)
- content: The full insight text (max 500 chars)
- category: One of: knowledge, pattern, observation, idea, reference
- confidence: How confident you are in this insight (0.0 to 1.0)
- tags: 2-5 relevant tags
- relatedConcepts: 1-3 related concepts this connects to

Return a JSON array of insights.

Content to analyze:
---
${content.slice(0, 4000)}
---

Return ONLY valid JSON array, no other text.`;

    try {
      const response = await this.llm.generate({
        system: systemPrompt,
        prompt,
        temperature: 0.3,
        jsonMode: true,
      });

      const parsed = JSON.parse(response.text);
      const insights = Array.isArray(parsed) ? parsed : [parsed];
      
      return insights
        .map((i) => {
          try {
            return InsightSchema.parse(i);
          } catch {
            return null;
          }
        })
        .filter((i): i is ExtractedInsight => i !== null);
    } catch (error) {
      console.error('Failed to extract insights:', error);
      return [];
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.llm.embed(text);
  }

  getEmbeddingDimension(): number {
    return this.llm.getEmbeddingDimension();
  }
}
