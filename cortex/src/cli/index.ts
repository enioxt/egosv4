#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { loadConfig } from '../lib/config.js';
import { LLMBridge } from '../lib/llm-bridge.js';
import { getPrisma, getSqlite, searchSimilar } from '../lib/db.js';

const program = new Command();

program
  .name('cx')
  .description('Cortex - OS-wide Intelligence Layer')
  .version('0.1.0');

program
  .command('ask <query>')
  .description('Ask the Cortex a question using your indexed knowledge')
  .option('-s, --stream', 'Stream the response')
  .option('-l, --limit <n>', 'Limit context documents', '5')
  .action(async (query: string, options: { stream?: boolean; limit: string }) => {
    const spinner = ora('Thinking...').start();

    try {
      const config = await loadConfig();
      const llm = new LLMBridge(config.llm.openrouterApiKey);
      const db = getSqlite(config);
      const prisma = getPrisma(config);

      // Get query embedding
      spinner.text = 'Searching knowledge base...';
      const queryEmbedding = await llm.embed(query);

      // Find similar insights
      const similar = await searchSimilar(db, queryEmbedding, parseInt(options.limit));

      // Get full insights
      const insights = await prisma.insight.findMany({
        where: { id: { in: similar.map((s) => s.id) } },
      });

      // Build context
      const context = insights
        .map((i) => `## ${i.title}\n${i.content}`)
        .join('\n\n');

      spinner.text = 'Generating response...';

      const prompt = `Based on the following knowledge from my personal database, answer this question: "${query}"

Context from my knowledge base:
${context || 'No relevant context found.'}

If the context doesn't contain relevant information, say so and provide a general answer.`;

      if (options.stream) {
        spinner.stop();
        for await (const chunk of llm.stream({ prompt })) {
          process.stdout.write(chunk);
        }
        console.log();
      } else {
        const response = await llm.generate({ prompt });
        spinner.stop();
        console.log(response.text);
      }

      if (insights.length > 0) {
        console.log(chalk.dim(`\n📚 Based on ${insights.length} insights from your knowledge base`));
      }
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('search <query>')
  .description('Semantic search across indexed content')
  .option('-n, --limit <n>', 'Number of results', '10')
  .option('-f, --files-only', 'Show only file paths')
  .action(async (query: string, options: { limit: string; filesOnly?: boolean }) => {
    const spinner = ora('Searching...').start();

    try {
      const config = await loadConfig();
      const llm = new LLMBridge(config.llm.openrouterApiKey);
      const db = getSqlite(config);
      const prisma = getPrisma(config);

      const queryEmbedding = await llm.embed(query);
      const similar = await searchSimilar(db, queryEmbedding, parseInt(options.limit));

      if (similar.length === 0) {
        spinner.info('No results found');
        return;
      }

      const insights = await prisma.insight.findMany({
        where: { id: { in: similar.map((s) => s.id) } },
        include: { sourceFile: true },
      });

      spinner.stop();

      if (options.filesOnly) {
        const paths = new Set(insights.map((i) => i.sourceFile?.path).filter(Boolean));
        paths.forEach((p) => console.log(p));
      } else {
        const table = new Table({
          head: [chalk.cyan('Score'), chalk.cyan('Title'), chalk.cyan('Category')],
          colWidths: [8, 50, 15],
        });

        for (const result of similar) {
          const insight = insights.find((i) => i.id === result.id);
          if (insight) {
            table.push([
              result.score.toFixed(2),
              insight.title.slice(0, 47) + (insight.title.length > 47 ? '...' : ''),
              insight.category,
            ]);
          }
        }

        console.log(table.toString());
      }
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show Cortex status and statistics')
  .action(async () => {
    try {
      const config = await loadConfig();
      const prisma = getPrisma(config);
      const llm = new LLMBridge(config.llm.openrouterApiKey);

      console.log(chalk.bold('\n🧠 Cortex Status\n'));
      console.log('─'.repeat(40));

      // LLM Status
      const llmHealthy = await llm.isHealthy();
      console.log(
        `LLM Provider:   ${llmHealthy ? chalk.green('●') : chalk.red('●')} ${config.llm.provider}`
      );
      console.log(`Model:          ${config.llm.model}`);

      // Database stats
      const fileCount = await prisma.sourceFile.count();
      const insightCount = await prisma.insight.count();
      const linkCount = await prisma.insightLink.count();
      const pendingCount = await prisma.sourceFile.count({ where: { status: 'pending' } });

      console.log(`\n${chalk.bold('📊 Statistics')}`);
      console.log('─'.repeat(40));
      console.log(`Files indexed:  ${fileCount}`);
      console.log(`Insights:       ${insightCount}`);
      console.log(`Links:          ${linkCount}`);
      console.log(`Pending:        ${pendingCount}`);

      // Watch sources
      console.log(`\n${chalk.bold('👁️ Watch Sources')}`);
      console.log('─'.repeat(40));
      for (const source of config.watchSources) {
        console.log(`${chalk.cyan(source.id)}: ${source.path} (${source.lens})`);
      }

      console.log();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const config = await loadConfig();
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('history')
  .description('Search command history')
  .argument('[query]', 'Search query')
  .option('-n, --limit <n>', 'Number of results', '20')
  .action(async (query: string | undefined, options: { limit: string }) => {
    try {
      const config = await loadConfig();
      const prisma = getPrisma(config);

      const where = query
        ? { command: { contains: query } }
        : {};

      const history = await prisma.commandHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(options.limit),
      });

      if (history.length === 0) {
        console.log(chalk.dim('No command history found'));
        return;
      }

      const table = new Table({
        head: [chalk.cyan('Time'), chalk.cyan('Command'), chalk.cyan('Exit')],
        colWidths: [20, 50, 6],
      });

      for (const cmd of history) {
        table.push([
          cmd.createdAt.toLocaleString(),
          cmd.command.slice(0, 47) + (cmd.command.length > 47 ? '...' : ''),
          cmd.exitCode?.toString() ?? '-',
        ]);
      }

      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('history-add')
  .description('Add command to history (used by shell integration)')
  .argument('<command>', 'Command to add')
  .argument('[cwd]', 'Working directory')
  .action(async (command: string, cwd?: string) => {
    try {
      const config = await loadConfig();
      const prisma = getPrisma(config);

      await prisma.commandHistory.create({
        data: {
          command,
          cwd,
        },
      });
    } catch {
      // Silent fail for shell integration
    }
  });

program
  .command('daemon')
  .description('Manage Cortex daemon')
  .argument('<action>', 'start|stop|restart|status')
  .action(async (action: string) => {
    const { execSync, spawn } = await import('child_process');
    
    const isSystemd = () => {
      try {
        execSync('systemctl --user status cortexd 2>/dev/null', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    };

    try {
      if (isSystemd()) {
        // Use systemd
        switch (action) {
          case 'start':
            execSync('systemctl --user start cortexd', { stdio: 'inherit' });
            console.log(chalk.green('✓ Daemon started via systemd'));
            break;
          case 'stop':
            execSync('systemctl --user stop cortexd', { stdio: 'inherit' });
            console.log(chalk.green('✓ Daemon stopped'));
            break;
          case 'restart':
            execSync('systemctl --user restart cortexd', { stdio: 'inherit' });
            console.log(chalk.green('✓ Daemon restarted'));
            break;
          case 'status':
            execSync('systemctl --user status cortexd', { stdio: 'inherit' });
            break;
          default:
            console.error(chalk.red('Unknown action. Use: start|stop|restart|status'));
        }
      } else {
        // Fallback to direct process management
        const pidFile = '/tmp/cortexd.pid';
        const { existsSync, readFileSync, writeFileSync, unlinkSync } = await import('fs');

        switch (action) {
          case 'start':
            if (existsSync(pidFile)) {
              console.log(chalk.yellow('Daemon may already be running'));
              return;
            }
            const child = spawn('node', ['dist/daemon/index.js'], {
              detached: true,
              stdio: 'ignore',
              cwd: process.cwd(),
            });
            child.unref();
            writeFileSync(pidFile, String(child.pid));
            console.log(chalk.green(`✓ Daemon started (PID: ${child.pid})`));
            break;
          case 'stop':
            if (!existsSync(pidFile)) {
              console.log(chalk.yellow('Daemon not running'));
              return;
            }
            const pid = parseInt(readFileSync(pidFile, 'utf-8'));
            process.kill(pid, 'SIGTERM');
            unlinkSync(pidFile);
            console.log(chalk.green('✓ Daemon stopped'));
            break;
          case 'restart':
            execSync('cx daemon stop', { stdio: 'inherit' });
            execSync('cx daemon start', { stdio: 'inherit' });
            break;
          case 'status':
            if (existsSync(pidFile)) {
              const pid = readFileSync(pidFile, 'utf-8').trim();
              console.log(chalk.green(`Daemon running (PID: ${pid})`));
            } else {
              console.log(chalk.yellow('Daemon not running'));
            }
            break;
          default:
            console.error(chalk.red('Unknown action. Use: start|stop|restart|status'));
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('reindex')
  .description('Force reindex all files')
  .option('--source <id>', 'Only reindex specific source')
  .action(async (options: { source?: string }) => {
    const spinner = ora('Reindexing...').start();
    
    try {
      const config = await loadConfig();
      const prisma = getPrisma(config);

      const where = options.source ? { sourceId: options.source } : {};
      
      await prisma.sourceFile.updateMany({
        where,
        data: { status: 'pending' },
      });

      const count = await prisma.sourceFile.count({ where: { status: 'pending' } });
      spinner.succeed(`Marked ${count} files for reindexing`);
      console.log(chalk.dim('Start daemon to process: cx daemon start'));
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
