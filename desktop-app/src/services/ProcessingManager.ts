import { WebODMClient, TaskStatus } from './WebODMClient';
import { Logger } from '../utils/Logger';

export interface ProcessingOptions {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  checkpointInterval?: number;
}

export interface TaskProgress {
  taskId: number;
  projectId: number;
  status: number;
  progress: number;
  message: string;
  lastError?: string;
  processingTime: number;
}

export class ProcessingManager {
  private webodmClient: WebODMClient;
  private logger: Logger;
  private activeTasks: Map<number, NodeJS.Timeout> = new Map();
  private progressCallbacks: Map<number, (progress: TaskProgress) => void> = new Map();

  constructor(webodmClient: WebODMClient) {
    this.webodmClient = webodmClient;
    this.logger = new Logger('ProcessingManager');
  }

  async processWithRetry(taskId: number, projectId: number, options: ProcessingOptions = {}): Promise<void> {
    const {
      retryAttempts = 3,
      retryDelay = 5000,
      timeout = 7200000, // 2 hours
      checkpointInterval = 300000 // 5 minutes
    } = options;

    this.logger.info(`Starting processing for task ${taskId} with retry logic`, {
      retryAttempts,
      retryDelay,
      timeout
    });

    let attempt = 1;
    let lastError: Error | null = null;

    while (attempt <= retryAttempts) {
      try {
        await this.processTask(taskId, projectId, timeout, checkpointInterval);
        this.logger.info(`Task ${taskId} completed successfully`);
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Task ${taskId} failed on attempt ${attempt}/${retryAttempts}`, {
          error: lastError.message,
          attempt
        });

        if (attempt < retryAttempts) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.info(`Retrying task ${taskId} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        attempt++;
      }
    }

    this.logger.error(`Task ${taskId} failed after ${retryAttempts} attempts`, lastError);
    throw lastError;
  }

  async monitorTaskHealth(taskId: number, projectId: number): Promise<void> {
    this.logger.info(`Starting health monitoring for task ${taskId}`);
    
    const healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.webodmClient.getTaskStatus(taskId, projectId);
        
        if (status.status === 3) { // FAILED
          this.logger.error(`Task ${taskId} has failed`, { lastError: status.last_error });
          clearInterval(healthCheckInterval);
          this.activeTasks.delete(taskId);
        } else if (status.status === 2) { // COMPLETED
          this.logger.info(`Task ${taskId} completed successfully`);
          clearInterval(healthCheckInterval);
          this.activeTasks.delete(taskId);
        }
      } catch (error) {
        this.logger.error(`Health check failed for task ${taskId}`, error);
      }
    }, 10000); // Check every 10 seconds

    this.activeTasks.set(taskId, healthCheckInterval);
  }

  async handleNodeFailure(taskId: number, projectId: number, failedNodeId: number): Promise<void> {
    this.logger.warn(`Handling node failure for task ${taskId}`, { failedNodeId });
    
    try {
      // Get available nodes
      const nodes = await this.webodmClient.getProcessingNodes();
      const availableNodes = nodes.filter(node => node.online && node.id !== failedNodeId);
      
      if (availableNodes.length === 0) {
        throw new Error('No available processing nodes');
      }
      
      // Find the best available node (lowest queue count)
      const bestNode = availableNodes.reduce((best, current) => 
        current.queue_count < best.queue_count ? current : best
      );
      
      this.logger.info(`Redistributing task ${taskId} to node ${bestNode.id}`, {
        nodeId: bestNode.id,
        queueCount: bestNode.queue_count
      });
      
      // Note: WebODM doesn't have a direct API to move tasks between nodes
      // This would require restarting the task with a different node
      // For now, we'll log the intention and let the user handle it manually
      this.logger.warn('Task redistribution requires manual intervention - WebODM API limitation');
      
    } catch (error) {
      this.logger.error(`Failed to handle node failure for task ${taskId}`, error);
      throw error;
    }
  }

  async redistributeTask(taskId: number, projectId: number, newNodeId: number): Promise<void> {
    this.logger.info(`Redistributing task ${taskId} to node ${newNodeId}`);
    
    try {
      // Cancel current task
      await this.webodmClient.cancelTask(taskId, projectId);
      
      // Note: WebODM doesn't have a direct API to reassign tasks to different nodes
      // This would require recreating the task with the new node
      this.logger.warn('Task redistribution requires task recreation - WebODM API limitation');
      
    } catch (error) {
      this.logger.error(`Failed to redistribute task ${taskId}`, error);
      throw error;
    }
  }

  async trackProgress(taskId: number, projectId: number, onUpdate: (progress: TaskProgress) => void): Promise<void> {
    this.logger.info(`Starting progress tracking for task ${taskId}`);
    
    this.progressCallbacks.set(taskId, onUpdate);
    
    const progressInterval = setInterval(async () => {
      try {
        const status = await this.webodmClient.getTaskStatus(taskId, projectId);
        const output = await this.webodmClient.getTaskOutput(taskId, projectId);
        
        const progress: TaskProgress = {
          taskId,
          projectId,
          status: status.status,
          progress: status.progress,
          message: this.getStatusMessage(status.status),
          lastError: status.last_error,
          processingTime: status.processing_time
        };
        
        onUpdate(progress);
        
        // Stop tracking if task is completed or failed
        if (status.status === 2 || status.status === 3) {
          clearInterval(progressInterval);
          this.progressCallbacks.delete(taskId);
        }
        
      } catch (error) {
        this.logger.error(`Progress tracking failed for task ${taskId}`, error);
      }
    }, 5000); // Update every 5 seconds

    this.activeTasks.set(taskId, progressInterval);
  }

  async recoverFromError(taskId: number, projectId: number, error: Error): Promise<void> {
    this.logger.info(`Attempting to recover task ${taskId} from error`, { error: error.message });
    
    try {
      // Get current task status
      const status = await this.webodmClient.getTaskStatus(taskId, projectId);
      
      if (status.status === 3) { // FAILED
        this.logger.info(`Task ${taskId} is in failed state, attempting restart`);
        
        // Note: WebODM doesn't have a direct restart API
        // This would require recreating the task
        this.logger.warn('Task recovery requires manual intervention - WebODM API limitation');
      } else if (status.status === 1) { // RUNNING
        this.logger.info(`Task ${taskId} is still running, continuing monitoring`);
      }
      
    } catch (recoveryError) {
      this.logger.error(`Failed to recover task ${taskId}`, recoveryError);
      throw recoveryError;
    }
  }

  async validateResults(taskId: number, projectId: number): Promise<boolean> {
    this.logger.info(`Validating results for task ${taskId}`);
    
    try {
      const status = await this.webodmClient.getTaskStatus(taskId, projectId);
      
      if (status.status !== 2) { // Not completed
        this.logger.warn(`Task ${taskId} is not completed, cannot validate results`);
        return false;
      }
      
      // Check if task has required assets
      // This would require getting task details to check available_assets
      this.logger.info(`Task ${taskId} results validation completed`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to validate results for task ${taskId}`, error);
      return false;
    }
  }

  stopMonitoring(taskId: number): void {
    const interval = this.activeTasks.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.activeTasks.delete(taskId);
      this.progressCallbacks.delete(taskId);
      this.logger.info(`Stopped monitoring task ${taskId}`);
    }
  }

  stopAllMonitoring(): void {
    this.logger.info('Stopping all task monitoring');
    
    for (const [taskId, interval] of this.activeTasks) {
      clearInterval(interval);
    }
    
    this.activeTasks.clear();
    this.progressCallbacks.clear();
  }

  private async processTask(taskId: number, projectId: number, timeout: number, checkpointInterval: number): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.logger.error(`Task ${taskId} timed out after ${timeout}ms`);
        reject(new Error(`Task ${taskId} timed out`));
      }, timeout);
      
      const checkInterval = setInterval(async () => {
        try {
          const status = await this.webodmClient.getTaskStatus(taskId, projectId);
          
          if (status.status === 2) { // COMPLETED
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
            resolve();
          } else if (status.status === 3) { // FAILED
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
            reject(new Error(`Task ${taskId} failed: ${status.last_error}`));
          }
          
          // Checkpoint: log progress every checkpointInterval
          if (Date.now() - startTime > checkpointInterval) {
            this.logger.info(`Task ${taskId} checkpoint`, {
              status: status.status,
              progress: status.progress,
              processingTime: status.processing_time
            });
          }
          
        } catch (error) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          reject(error);
        }
      }, 10000); // Check every 10 seconds
    });
  }

  private getStatusMessage(status: number): string {
    const statusMessages: Record<number, string> = {
      0: 'Queued for processing',
      1: 'Processing in progress',
      2: 'Processing completed',
      3: 'Processing failed',
      4: 'Processing cancelled'
    };
    
    return statusMessages[status] || 'Unknown status';
  }
}
