import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { Logger } from '../utils/Logger';

export interface QueuedTask {
  id: string;
  projectId: number;
  name: string;
  images: string[];
  options: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  checkpointData?: string;
  priority: number;
}

export interface TaskQueueOptions {
  maxConcurrentTasks?: number;
  retryDelay?: number;
  maxRetries?: number;
  checkpointInterval?: number;
}

export class TaskQueue {
  private db: Database.Database;
  private logger: Logger;
  private options: Required<TaskQueueOptions>;
  private processingTasks: Set<string> = new Set();
  private isProcessing: boolean = false;

  constructor(options: TaskQueueOptions = {}) {
    this.logger = new Logger('TaskQueue');
    
    this.options = {
      maxConcurrentTasks: 3,
      retryDelay: 5000,
      maxRetries: 3,
      checkpointInterval: 300000, // 5 minutes
      ...options
    };

    // Initialize database
    const dbPath = join(homedir(), '.webodm-desktop', 'tasks.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        images TEXT NOT NULL, -- JSON array of image paths
        options TEXT NOT NULL, -- JSON object
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        checkpoint_data TEXT,
        priority INTEGER NOT NULL DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    `);
  }

  async addTask(
    projectId: number,
    name: string,
    images: string[],
    options: Record<string, any> = {},
    priority: number = 0
  ): Promise<string> {
    const taskId = this.generateTaskId();
    const now = new Date().toISOString();
    
    const task: QueuedTask = {
      id: taskId,
      projectId,
      name,
      images,
      options,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.options.maxRetries,
      createdAt: now,
      updatedAt: now,
      priority
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, project_id, name, images, options, status, retry_count, 
        max_retries, created_at, updated_at, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.projectId,
      task.name,
      JSON.stringify(task.images),
      JSON.stringify(task.options),
      task.status,
      task.retryCount,
      task.maxRetries,
      task.createdAt,
      task.updatedAt,
      task.priority
    );

    this.logger.info(`Added task to queue: ${taskId}`, {
      projectId,
      name,
      imageCount: images.length,
      priority
    });

    return taskId;
  }

  async getNextTask(): Promise<QueuedTask | null> {
    if (this.processingTasks.size >= this.options.maxConcurrentTasks) {
      return null;
    }

    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'pending' 
      ORDER BY priority DESC, created_at ASC 
      LIMIT 1
    `);

    const row = stmt.get() as any;
    if (!row) {
      return null;
    }

    return this.rowToTask(row);
  }

  async getTask(taskId: string): Promise<QueuedTask | null> {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(taskId) as any;
    
    if (!row) {
      return null;
    }

    return this.rowToTask(row);
  }

  async updateTaskStatus(
    taskId: string, 
    status: QueuedTask['status'], 
    error?: string,
    checkpointData?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, last_error = ?, updated_at = ?, checkpoint_data = ?
      WHERE id = ?
    `);

    stmt.run(status, error || null, now, checkpointData || null, taskId);

    this.logger.info(`Updated task status: ${taskId} -> ${status}`, { error });
  }

  async incrementRetryCount(taskId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET retry_count = retry_count + 1, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), taskId);
  }

  async markTaskProcessing(taskId: string): Promise<void> {
    this.processingTasks.add(taskId);
    await this.updateTaskStatus(taskId, 'processing');
  }

  async markTaskCompleted(taskId: string): Promise<void> {
    this.processingTasks.delete(taskId);
    await this.updateTaskStatus(taskId, 'completed');
  }

  async markTaskFailed(taskId: string, error: string): Promise<void> {
    this.processingTasks.delete(taskId);
    await this.updateTaskStatus(taskId, 'failed', error);
  }

  async markTaskCancelled(taskId: string): Promise<void> {
    this.processingTasks.delete(taskId);
    await this.updateTaskStatus(taskId, 'cancelled');
  }

  async getPendingTasks(): Promise<QueuedTask[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'pending' 
      ORDER BY priority DESC, created_at ASC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTask(row));
  }

  async getProcessingTasks(): Promise<QueuedTask[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'processing' 
      ORDER BY updated_at ASC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTask(row));
  }

  async getCompletedTasks(limit: number = 50): Promise<QueuedTask[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'completed' 
      ORDER BY updated_at DESC 
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.rowToTask(row));
  }

  async getFailedTasks(): Promise<QueuedTask[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'failed' 
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTask(row));
  }

  async removeTask(taskId: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(taskId);
    
    this.processingTasks.delete(taskId);
    this.logger.info(`Removed task from queue: ${taskId}`);
  }

  async clearCompletedTasks(): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM tasks WHERE status = 'completed'");
    const result = stmt.run();
    
    this.logger.info(`Cleared ${result.changes} completed tasks`);
  }

  async clearFailedTasks(): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM tasks WHERE status = 'failed'");
    const result = stmt.run();
    
    this.logger.info(`Cleared ${result.changes} failed tasks`);
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `);

    const rows = stmt.all() as any[];
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0
    };

    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }

    return stats;
  }

  async shouldRetryTask(taskId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) {
      return false;
    }

    return task.retryCount < task.maxRetries && task.status === 'failed';
  }

  async getTasksForRetry(): Promise<QueuedTask[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'failed' 
      AND retry_count < max_retries
      ORDER BY updated_at ASC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTask(row));
  }

  async resetFailedTasks(): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = 'pending', retry_count = 0, last_error = NULL, updated_at = ?
      WHERE status = 'failed' AND retry_count < max_retries
    `);

    const result = stmt.run(new Date().toISOString());
    this.logger.info(`Reset ${result.changes} failed tasks to pending`);
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private rowToTask(row: any): QueuedTask {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      images: JSON.parse(row.images),
      options: JSON.parse(row.options),
      status: row.status,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      checkpointData: row.checkpoint_data,
      priority: row.priority
    };
  }

  close(): void {
    this.db.close();
    this.logger.info('Task queue database closed');
  }
}
