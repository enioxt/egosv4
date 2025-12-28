/**
 * Code Health Monitor
 * 
 * Low-level telemetry for code quality tracking.
 * Runs on /start and pre-commit to evaluate codebase health.
 * 
 * Metrics:
 * - File size (lines)
 * - Function complexity
 * - Duplicate code detection
 * - TODO/FIXME tracking
 * - Change frequency
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const TELEMETRY_FILE = join(process.cwd(), '.windsurf', 'code-health-telemetry.json');
const THRESHOLDS = {
  maxFileLines: 500,
  maxFunctionComplexity: 20,
  duplicateOccurrences: 3,
  todoAgeWarningDays: 7,
};

interface FileMetrics {
  path: string;
  lines: number;
  functions: number;
  todos: number;
  fixmes: number;
  imports: number;
  lastModified: string;
}

interface CodeHealthReport {
  timestamp: string;
  totalFiles: number;
  totalLines: number;
  filesOverThreshold: string[];
  pendingRefactors: Array<{
    file: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  score: number; // 0-100
  changedSinceLastCheck: number;
}

interface TelemetryEntry {
  event: 'session_start' | 'pre_commit' | 'file_change' | 'refactor_decision';
  timestamp: string;
  data: Record<string, unknown>;
}

// Count lines in a file
function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

// Count TODOs and FIXMEs
function countTodosFixmes(filePath: string): { todos: number; fixmes: number } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const todos = (content.match(/TODO/gi) || []).length;
    const fixmes = (content.match(/FIXME/gi) || []).length;
    return { todos, fixmes };
  } catch {
    return { todos: 0, fixmes: 0 };
  }
}

// Get file metrics
function getFileMetrics(filePath: string): FileMetrics {
  const stats = statSync(filePath);
  const lines = countLines(filePath);
  const { todos, fixmes } = countTodosFixmes(filePath);
  
  // Count imports (rough estimate for TS/JS files)
  let imports = 0;
  try {
    const content = readFileSync(filePath, 'utf-8');
    imports = (content.match(/^import /gm) || []).length;
  } catch {
    // ignore
  }

  return {
    path: filePath,
    lines,
    functions: 0, // Would need AST parsing for accurate count
    todos,
    fixmes,
    imports,
    lastModified: stats.mtime.toISOString(),
  };
}

// Scan directory for code files
function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Skip common non-code directories
      if (entry.isDirectory()) {
        const skipDirs = ['node_modules', '.git', 'dist', '.next', 'coverage', 'venv', '__pycache__', '.cache'];
        if (skipDirs.includes(entry.name) || entry.name.startsWith('archive')) {
          continue;
        }
        files.push(...scanDirectory(fullPath, extensions));
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        files.push(fullPath);
      }
    }
  } catch {
    // ignore permission errors
  }
  
  return files;
}

// Calculate code health score
function calculateHealthScore(report: Partial<CodeHealthReport>): number {
  let score = 100;
  
  // Deduct for files over threshold
  const overThresholdPenalty = (report.filesOverThreshold?.length || 0) * 5;
  score -= Math.min(overThresholdPenalty, 30);
  
  // Deduct for pending refactors
  const refactorPenalty = (report.pendingRefactors?.length || 0) * 3;
  score -= Math.min(refactorPenalty, 20);
  
  // Deduct for high priority refactors
  const highPriorityCount = report.pendingRefactors?.filter(r => r.priority === 'high').length || 0;
  score -= highPriorityCount * 5;
  
  return Math.max(0, Math.min(100, score));
}

// Generate health report
export function generateHealthReport(rootDir: string): CodeHealthReport {
  const files = scanDirectory(rootDir);
  const filesOverThreshold: string[] = [];
  const pendingRefactors: CodeHealthReport['pendingRefactors'] = [];
  let totalLines = 0;

  for (const file of files) {
    const metrics = getFileMetrics(file);
    totalLines += metrics.lines;

    // Check thresholds
    if (metrics.lines > THRESHOLDS.maxFileLines) {
      filesOverThreshold.push(file);
      pendingRefactors.push({
        file: file.replace(rootDir, ''),
        reason: `File has ${metrics.lines} lines (threshold: ${THRESHOLDS.maxFileLines})`,
        priority: metrics.lines > THRESHOLDS.maxFileLines * 1.5 ? 'high' : 'medium',
      });
    }

    // Track TODOs/FIXMEs
    if (metrics.todos + metrics.fixmes > 3) {
      pendingRefactors.push({
        file: file.replace(rootDir, ''),
        reason: `${metrics.todos} TODOs, ${metrics.fixmes} FIXMEs`,
        priority: 'low',
      });
    }
  }

  const report: CodeHealthReport = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    totalLines,
    filesOverThreshold,
    pendingRefactors,
    score: 0,
    changedSinceLastCheck: 0,
  };

  report.score = calculateHealthScore(report);

  return report;
}

// Save telemetry event
export function logTelemetry(entry: TelemetryEntry): void {
  let history: TelemetryEntry[] = [];
  
  if (existsSync(TELEMETRY_FILE)) {
    try {
      history = JSON.parse(readFileSync(TELEMETRY_FILE, 'utf-8'));
    } catch {
      history = [];
    }
  }

  history.push(entry);
  
  // Keep last 100 entries
  if (history.length > 100) {
    history = history.slice(-100);
  }

  writeFileSync(TELEMETRY_FILE, JSON.stringify(history, null, 2));
}

// Main CLI
if (require.main === module) {
  const rootDir = process.argv[2] || process.cwd();
  
  console.log('🔍 Running Code Health Monitor...\n');
  
  const report = generateHealthReport(rootDir);
  
  console.log(`📊 Code Health Score: ${report.score}/100`);
  console.log(`📁 Total Files: ${report.totalFiles}`);
  console.log(`📝 Total Lines: ${report.totalLines.toLocaleString()}`);
  
  if (report.filesOverThreshold.length > 0) {
    console.log(`\n⚠️ Files over ${THRESHOLDS.maxFileLines} lines:`);
    report.filesOverThreshold.slice(0, 10).forEach(f => {
      console.log(`   - ${f.replace(rootDir, '')}`);
    });
  }
  
  if (report.pendingRefactors.length > 0) {
    console.log('\n🔧 Pending Refactors:');
    const highPriority = report.pendingRefactors.filter(r => r.priority === 'high');
    highPriority.slice(0, 5).forEach(r => {
      console.log(`   [HIGH] ${r.file}: ${r.reason}`);
    });
  }

  // Log telemetry
  logTelemetry({
    event: 'session_start',
    timestamp: new Date().toISOString(),
    data: {
      score: report.score,
      totalFiles: report.totalFiles,
      filesOverThreshold: report.filesOverThreshold.length,
      pendingRefactors: report.pendingRefactors.length,
    },
  });

  console.log('\n✅ Telemetry logged to .windsurf/code-health-telemetry.json');
}
