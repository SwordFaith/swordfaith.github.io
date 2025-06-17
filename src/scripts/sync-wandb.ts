/**
 * WandB 数据同步脚本
 * 定期从 WandB API 获取数据并缓存到本地文件
 */

import fs from 'fs/promises';
import path from 'path';
import { wandbClient, type WandBProject, type WandBRun } from '../utils/wandb-client';

export interface WandBCache {
  lastSync: string;
  entity: string;
  projects: WandBProject[];
  runs: Record<string, WandBRun[]>; // key: projectName, value: runs
  runDetails: Record<string, WandBRun>; // key: runId, value: run details
  runHistory: Record<string, any[]>; // key: runId, value: history data
}

export class WandBSyncer {
  private cacheDir: string;
  private cacheFile: string;
  private entity: string;

  constructor(entity: string, cacheDir = 'public/data/wandb') {
    this.entity = entity;
    this.cacheDir = cacheDir;
    this.cacheFile = path.join(cacheDir, 'cache.json');
  }

  /**
   * 执行完整的数据同步
   */
  async syncAll(options: {
    projects?: string[];
    maxRunsPerProject?: number;
    syncHistory?: boolean;
    syncMetrics?: string[];
  } = {}): Promise<void> {
    const {
      projects: targetProjects,
      maxRunsPerProject = 50,
      syncHistory = false,
      syncMetrics = ['loss', 'accuracy', 'learning_rate', 'epoch']
    } = options;

    console.log(`Starting WandB sync for entity: ${this.entity}`);
    
    try {
      // 确保缓存目录存在
      await this.ensureCacheDir();

      // 加载现有缓存
      const cache = await this.loadCache();

      // 1. 同步项目信息
      console.log('Syncing projects...');
      const projects = await wandbClient.getProjects(this.entity);
      
      let filteredProjects = projects;
      if (targetProjects && targetProjects.length > 0) {
        filteredProjects = projects.filter(p => targetProjects.includes(p.name));
      }

      cache.projects = filteredProjects;
      console.log(`Found ${filteredProjects.length} projects`);

      // 2. 同步每个项目的运行数据
      for (const project of filteredProjects) {
        console.log(`Syncing runs for project: ${project.name}`);
        
        try {
          const runs = await wandbClient.getRuns(project.name, this.entity, maxRunsPerProject);
          cache.runs[project.name] = runs;
          
          console.log(`  Found ${runs.length} runs`);

          // 3. 同步运行详情（可选）
          if (syncHistory) {
            for (const run of runs.slice(0, 10)) { // 限制详情同步数量
              try {
                console.log(`  Syncing details for run: ${run.name}`);
                
                // 获取运行详情
                const runDetail = await wandbClient.getRun(this.entity, project.name, run.id);
                if (runDetail) {
                  cache.runDetails[run.id] = runDetail;
                }

                // 获取指标历史
                const history = await wandbClient.getRunHistory(
                  this.entity, 
                  project.name, 
                  run.id, 
                  syncMetrics
                );
                cache.runHistory[run.id] = history;
                
                // 防止 API 限制
                await this.sleep(100);
              } catch (error) {
                console.warn(`    Failed to sync details for run ${run.name}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`  Failed to sync project ${project.name}:`, error);
        }
      }

      // 4. 更新同步时间
      cache.lastSync = new Date().toISOString();
      cache.entity = this.entity;

      // 5. 保存缓存
      await this.saveCache(cache);
      
      console.log('WandB sync completed successfully');
      console.log(`Cache saved to: ${this.cacheFile}`);
      
      // 6. 生成同步报告
      await this.generateSyncReport(cache);
      
    } catch (error) {
      console.error('WandB sync failed:', error);
      throw error;
    }
  }

  /**
   * 增量同步（只同步最近更新的数据）
   */
  async syncIncremental(): Promise<void> {
    console.log('Starting incremental WandB sync...');
    
    const cache = await this.loadCache();
    const lastSync = cache.lastSync ? new Date(cache.lastSync) : new Date(0);
    
    // 同步最近更新的项目
    const projects = await wandbClient.getProjects(this.entity);
    const updatedProjects = projects.filter(p => 
      new Date(p.updated_at) > lastSync
    );
    
    if (updatedProjects.length === 0) {
      console.log('No updates found');
      return;
    }
    
    console.log(`Found ${updatedProjects.length} updated projects`);
    
    // 更新项目信息
    for (const updatedProject of updatedProjects) {
      const existingIndex = cache.projects.findIndex(p => p.name === updatedProject.name);
      if (existingIndex >= 0) {
        cache.projects[existingIndex] = updatedProject;
      } else {
        cache.projects.push(updatedProject);
      }
      
      // 同步该项目的最新运行
      const runs = await wandbClient.getRuns(updatedProject.name, this.entity, 20);
      cache.runs[updatedProject.name] = runs;
    }
    
    cache.lastSync = new Date().toISOString();
    await this.saveCache(cache);
    
    console.log('Incremental sync completed');
  }

  /**
   * 加载缓存数据
   */
  async loadCache(): Promise<WandBCache> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // 如果缓存文件不存在，返回空缓存
      return {
        lastSync: '',
        entity: this.entity,
        projects: [],
        runs: {},
        runDetails: {},
        runHistory: {}
      };
    }
  }

  /**
   * 保存缓存数据
   */
  async saveCache(cache: WandBCache): Promise<void> {
    await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2));
  }

  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 生成同步报告
   */
  private async generateSyncReport(cache: WandBCache): Promise<void> {
    const reportPath = path.join(this.cacheDir, 'sync-report.json');
    
    const totalRuns = Object.values(cache.runs).reduce((sum, runs) => sum + runs.length, 0);
    const totalRunDetails = Object.keys(cache.runDetails).length;
    const totalHistory = Object.keys(cache.runHistory).length;
    
    const report = {
      syncTime: cache.lastSync,
      entity: cache.entity,
      stats: {
        projects: cache.projects.length,
        totalRuns,
        runDetails: totalRunDetails,
        historyRecords: totalHistory
      },
      projects: cache.projects.map(p => ({
        name: p.name,
        runCount: cache.runs[p.name]?.length || 0,
        lastUpdated: p.updated_at
      }))
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Sync report saved to: ${reportPath}`);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理旧缓存
   */
  async cleanupCache(daysToKeep = 7): Promise<void> {
    console.log(`Cleaning up cache older than ${daysToKeep} days...`);
    
    const cache = await this.loadCache();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // 清理运行历史数据
    let cleaned = 0;
    for (const [runId, run] of Object.entries(cache.runDetails)) {
      if (new Date(run.updated_at) < cutoffDate) {
        delete cache.runDetails[runId];
        delete cache.runHistory[runId];
        cleaned++;
      }
    }
    
    await this.saveCache(cache);
    console.log(`Cleaned up ${cleaned} old run records`);
  }
}

// 导出默认同步器实例
export const defaultSyncer = new WandBSyncer(
  process.env.WANDB_ENTITY || 'your-entity'
);

// CLI 支持
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const entity = process.env.WANDB_ENTITY;
  
  if (!entity) {
    console.error('Please set WANDB_ENTITY environment variable');
    process.exit(1);
  }
  
  const syncer = new WandBSyncer(entity);
  
  switch (command) {
    case 'sync':
      await syncer.syncAll({
        projects: process.argv[3] ? process.argv[3].split(',') : undefined,
        syncHistory: process.argv.includes('--history')
      });
      break;
    case 'incremental':
      await syncer.syncIncremental();
      break;
    case 'cleanup':
      await syncer.cleanupCache();
      break;
    default:
      console.log('Usage: node sync-wandb.ts [sync|incremental|cleanup] [project1,project2] [--history]');
      break;
  }
}