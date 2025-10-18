import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { DockerManager } from './services/DockerManager';
import { WebODMClient } from './services/WebODMClient';
import { ProcessingManager } from './services/ProcessingManager';
import { TaskQueue } from './services/TaskQueue';
import { Logger } from './utils/Logger';

const isDev = process.env.NODE_ENV === 'development';
const logger = new Logger('main');

class Application {
  private mainWindow: BrowserWindow | null = null;
  private dockerManager: DockerManager;
  private webodmClient: WebODMClient;
  private processingManager: ProcessingManager;
  private taskQueue: TaskQueue;

  constructor() {
    this.dockerManager = new DockerManager();
    this.webodmClient = new WebODMClient();
    this.processingManager = new ProcessingManager(this.webodmClient);
    this.taskQueue = new TaskQueue();
  }

  async initialize() {
    await this.setupIPC();
    await this.startServices();
  }

  private async setupIPC() {
    // Docker management
    ipcMain.handle('docker:start-webodm', async () => {
      try {
        return await this.dockerManager.startWebODM();
      } catch (error) {
        logger.error('Failed to start WebODM:', error);
        throw error;
      }
    });

    ipcMain.handle('docker:start-nodeodm', async () => {
      try {
        return await this.dockerManager.startNodeODM();
      } catch (error) {
        logger.error('Failed to start NodeODM:', error);
        throw error;
      }
    });

    ipcMain.handle('docker:stop-containers', async () => {
      try {
        return await this.dockerManager.stopContainers();
      } catch (error) {
        logger.error('Failed to stop containers:', error);
        throw error;
      }
    });

    ipcMain.handle('docker:get-status', async () => {
      try {
        return await this.dockerManager.getContainerStatus();
      } catch (error) {
        logger.error('Failed to get container status:', error);
        throw error;
      }
    });

    // WebODM API
    ipcMain.handle('webodm:get-processing-nodes', async () => {
      try {
        return await this.webodmClient.getProcessingNodes();
      } catch (error) {
        logger.error('Failed to get processing nodes:', error);
        throw error;
      }
    });

    ipcMain.handle('webodm:create-project', async (_, name: string, description?: string) => {
      try {
        return await this.webodmClient.createProject(name, description);
      } catch (error) {
        logger.error('Failed to create project:', error);
        throw error;
      }
    });

    ipcMain.handle('webodm:create-task', async (_, projectId: string, images: string[], options: any) => {
      try {
        return await this.webodmClient.createTask(projectId, images, options);
      } catch (error) {
        logger.error('Failed to create task:', error);
        throw error;
      }
    });

    ipcMain.handle('webodm:upload-images', async (_, taskId: string, files: string[], onProgress: (progress: number) => void) => {
      try {
        return await this.webodmClient.uploadImages(taskId, files, onProgress);
      } catch (error) {
        logger.error('Failed to upload images:', error);
        throw error;
      }
    });

    ipcMain.handle('webodm:get-task-status', async (_, taskId: string) => {
      try {
        return await this.webodmClient.getTaskStatus(taskId);
      } catch (error) {
        logger.error('Failed to get task status:', error);
        throw error;
      }
    });

    // File operations
    ipcMain.handle('file:select-images', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        return result.filePaths;
      } catch (error) {
        logger.error('Failed to select images:', error);
        throw error;
      }
    });

    // Task queue
    ipcMain.handle('task-queue:get-tasks', async () => {
      try {
        return await this.taskQueue.getTasks();
      } catch (error) {
        logger.error('Failed to get tasks:', error);
        throw error;
      }
    });

    ipcMain.handle('task-queue:add-task', async (_, task: any) => {
      try {
        return await this.taskQueue.addTask(task);
      } catch (error) {
        logger.error('Failed to add task:', error);
        throw error;
      }
    });
  }

  private async startServices() {
    try {
      // Start Docker containers
      await this.dockerManager.startWebODM();
      await this.dockerManager.startNodeODM();
      
      // Initialize task queue
      await this.taskQueue.initialize();
      
      logger.info('Services started successfully');
    } catch (error) {
      logger.error('Failed to start services:', error);
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
      },
      icon: join(__dirname, '../assets/icon.png'),
    });

    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }
}

const application = new Application();

app.whenReady().then(async () => {
  await application.initialize();
  application.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      application.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup services
  try {
    await application.dockerManager.stopContainers();
    logger.info('Services stopped successfully');
  } catch (error) {
    logger.error('Failed to stop services:', error);
  }
});
