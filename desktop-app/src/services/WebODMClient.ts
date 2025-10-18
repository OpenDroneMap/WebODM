import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../utils/Logger';

export interface ProcessingNode {
  id: number;
  hostname: string;
  port: number;
  api_version: string;
  queue_count: number;
  max_images: number;
  label: string;
  engine: string;
  engine_version: string;
  online: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  tasks: number[];
}

export interface Task {
  id: number;
  name: string;
  project: number;
  processing_node: number;
  status: number;
  created_at: string;
  processing_time: number;
  last_error: string;
  options: Record<string, any>;
  available_assets: string[];
  images_count: number;
  size: number;
}

export interface TaskStatus {
  id: number;
  status: number;
  progress: number;
  last_error?: string;
  processing_time: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateTaskRequest {
  name?: string;
  options?: Record<string, any>;
  partial?: boolean;
}

export class WebODMClient {
  private client: AxiosInstance;
  private logger: Logger;
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.logger = new Logger('WebODMClient');
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error('Response error', error);
        return Promise.reject(error);
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  async authenticate(username: string, password: string): Promise<string> {
    try {
      const response = await this.client.post('/api/token-auth/', {
        username,
        password,
      });
      
      this.authToken = response.data.token;
      this.client.defaults.headers.common['Authorization'] = `JWT ${this.authToken}`;
      
      this.logger.info('Authentication successful');
      return this.authToken;
    } catch (error) {
      this.logger.error('Authentication failed', error);
      throw error;
    }
  }

  async getProcessingNodes(): Promise<ProcessingNode[]> {
    try {
      const response = await this.client.get('/api/processingnodes/');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get processing nodes', error);
      throw error;
    }
  }

  async createProject(name: string, description?: string): Promise<Project> {
    try {
      const response = await this.client.post('/api/projects/', {
        name,
        description,
      });
      
      this.logger.info(`Created project: ${name}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create project', error);
      throw error;
    }
  }

  async getProjects(): Promise<Project[]> {
    try {
      const response = await this.client.get('/api/projects/');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get projects', error);
      throw error;
    }
  }

  async createTask(projectId: number, images: string[], options: Record<string, any> = {}): Promise<Task> {
    try {
      const formData = new FormData();
      
      // Add images to form data
      for (const imagePath of images) {
        const fs = require('fs');
        const path = require('path');
        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = path.basename(imagePath);
        formData.append('images', new Blob([fileBuffer]), fileName);
      }
      
      // Add options
      formData.append('options', JSON.stringify(options));
      formData.append('partial', 'true');

      const response = await this.client.post(`/api/projects/${projectId}/tasks/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      this.logger.info(`Created task in project ${projectId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create task', error);
      throw error;
    }
  }

  async uploadImages(taskId: number, projectId: number, files: string[], onProgress?: (progress: number) => void): Promise<string[]> {
    try {
      const formData = new FormData();
      
      for (const filePath of files) {
        const fs = require('fs');
        const path = require('path');
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        formData.append('images', new Blob([fileBuffer]), fileName);
      }

      const response = await this.client.post(`/api/projects/${projectId}/tasks/${taskId}/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      
      this.logger.info(`Uploaded ${files.length} images to task ${taskId}`);
      return response.data.uploaded || [];
    } catch (error) {
      this.logger.error('Failed to upload images', error);
      throw error;
    }
  }

  async commitTask(taskId: number, projectId: number): Promise<Task> {
    try {
      const response = await this.client.post(`/api/projects/${projectId}/tasks/${taskId}/commit/`);
      
      this.logger.info(`Committed task ${taskId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to commit task', error);
      throw error;
    }
  }

  async getTaskStatus(taskId: number, projectId: number): Promise<TaskStatus> {
    try {
      const response = await this.client.get(`/api/projects/${projectId}/tasks/${taskId}/`);
      return {
        id: response.data.id,
        status: response.data.status,
        progress: this.calculateProgress(response.data.status),
        last_error: response.data.last_error,
        processing_time: response.data.processing_time,
      };
    } catch (error) {
      this.logger.error('Failed to get task status', error);
      throw error;
    }
  }

  async getTaskOutput(taskId: number, projectId: number, line: number = 0): Promise<string> {
    try {
      const response = await this.client.get(`/api/projects/${projectId}/tasks/${taskId}/output/`, {
        params: { line, f: 'text' },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get task output', error);
      throw error;
    }
  }

  async downloadAsset(taskId: number, projectId: number, asset: string): Promise<Buffer> {
    try {
      const response = await this.client.get(`/api/projects/${projectId}/tasks/${taskId}/download/${asset}`, {
        responseType: 'arraybuffer',
      });
      
      this.logger.info(`Downloaded asset ${asset} from task ${taskId}`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('Failed to download asset', error);
      throw error;
    }
  }

  async cancelTask(taskId: number, projectId: number): Promise<void> {
    try {
      await this.client.post(`/api/projects/${projectId}/tasks/${taskId}/cancel/`);
      this.logger.info(`Cancelled task ${taskId}`);
    } catch (error) {
      this.logger.error('Failed to cancel task', error);
      throw error;
    }
  }

  async removeTask(taskId: number, projectId: number): Promise<void> {
    try {
      await this.client.post(`/api/projects/${projectId}/tasks/${taskId}/remove/`);
      this.logger.info(`Removed task ${taskId}`);
    } catch (error) {
      this.logger.error('Failed to remove task', error);
      throw error;
    }
  }

  async withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          this.logger.error(`Operation failed after ${maxRetries} attempts`, lastError);
          throw lastError;
        }
        
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        this.logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`, { error: lastError.message });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private calculateProgress(status: number): number {
    // Map WebODM status codes to progress percentages
    const statusMap: Record<number, number> = {
      0: 0,    // QUEUED
      1: 25,   // RUNNING
      2: 50,   // COMPLETED
      3: 0,    // FAILED
      4: 0,    // CANCELLED
    };
    
    return statusMap[status] || 0;
  }
}
