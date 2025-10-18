import Docker from 'dockerode';
import { Logger } from '../utils/Logger';
import { join } from 'path';
import { homedir } from 'os';

export interface DockerConfig {
  webodmImage: string;
  nodeodmImage: string;
  webodmPort: number;
  nodeodmPort: number;
  dataDir: string;
}

export interface ContainerStatus {
  webodm: {
    running: boolean;
    healthy: boolean;
    port?: number;
  };
  nodeodm: {
    running: boolean;
    healthy: boolean;
    port?: number;
  };
}

export class DockerManager {
  private docker: Docker;
  private logger: Logger;
  private config: DockerConfig;
  private webodmContainer: Docker.Container | null = null;
  private nodeodmContainer: Docker.Container | null = null;

  constructor(config?: Partial<DockerConfig>) {
    this.docker = new Docker();
    this.logger = new Logger('DockerManager');
    
    this.config = {
      webodmImage: 'opendronemap/webodm_webapp:latest',
      nodeodmImage: 'opendronemap/nodeodm:latest',
      webodmPort: 8000,
      nodeodmPort: 3000,
      dataDir: join(homedir(), '.webodm-desktop'),
      ...config
    };
  }

  async startWebODM(): Promise<void> {
    try {
      this.logger.info('Starting WebODM container...');
      
      // Check if container already exists
      const existingContainer = await this.getContainerByName('webodm-desktop');
      if (existingContainer) {
        const info = await existingContainer.inspect();
        if (info.State.Running) {
          this.logger.info('WebODM container already running');
          this.webodmContainer = existingContainer;
          return;
        }
        await existingContainer.remove();
      }

      // Create data directory
      const dataDir = this.config.dataDir;
      if (!require('fs').existsSync(dataDir)) {
        require('fs').mkdirSync(dataDir, { recursive: true });
      }

      // Start WebODM container
      this.webodmContainer = await this.docker.createContainer({
        Image: this.config.webodmImage,
        name: 'webodm-desktop',
        Env: [
          'WO_PORT=8000',
          'WO_HOST=localhost',
          'WO_MEDIA_DIR=/webodm/app/media',
          'WO_DB_DIR=/webodm/db',
          'WO_DEFAULT_NODES=0'
        ],
        ExposedPorts: {
          '8000/tcp': {}
        },
        PortBindings: {
          '8000/tcp': [{ HostPort: this.config.webodmPort.toString() }]
        },
        Volumes: {
          '/webodm/app/media': {},
          '/webodm/db': {}
        },
        Binds: [
          `${dataDir}/media:/webodm/app/media`,
          `${dataDir}/db:/webodm/db`
        ],
        RestartPolicy: { Name: 'unless-stopped' }
      });

      await this.webodmContainer.start();
      this.logger.info('WebODM container started successfully');
      
      // Wait for WebODM to be ready
      await this.waitForWebODM();
      
    } catch (error) {
      this.logger.error('Failed to start WebODM container', error);
      throw error;
    }
  }

  async startNodeODM(): Promise<void> {
    try {
      this.logger.info('Starting NodeODM container...');
      
      // Check if container already exists
      const existingContainer = await this.getContainerByName('nodeodm-desktop');
      if (existingContainer) {
        const info = await existingContainer.inspect();
        if (info.State.Running) {
          this.logger.info('NodeODM container already running');
          this.nodeodmContainer = existingContainer;
          return;
        }
        await existingContainer.remove();
      }

      // Start NodeODM container
      this.nodeodmContainer = await this.docker.createContainer({
        Image: this.config.nodeodmImage,
        name: 'nodeodm-desktop',
        ExposedPorts: {
          '3000/tcp': {}
        },
        PortBindings: {
          '3000/tcp': [{ HostPort: this.config.nodeodmPort.toString() }]
        },
        RestartPolicy: { Name: 'unless-stopped' }
      });

      await this.nodeodmContainer.start();
      this.logger.info('NodeODM container started successfully');
      
      // Wait for NodeODM to be ready
      await this.waitForNodeODM();
      
    } catch (error) {
      this.logger.error('Failed to start NodeODM container', error);
      throw error;
    }
  }

  async stopContainers(): Promise<void> {
    try {
      this.logger.info('Stopping containers...');
      
      const containers = [this.webodmContainer, this.nodeodmContainer];
      
      for (const container of containers) {
        if (container) {
          try {
            await container.stop();
            this.logger.info(`Container ${container.id} stopped`);
          } catch (error) {
            this.logger.warn(`Failed to stop container ${container.id}`, error);
          }
        }
      }
      
      this.webodmContainer = null;
      this.nodeodmContainer = null;
      
    } catch (error) {
      this.logger.error('Failed to stop containers', error);
      throw error;
    }
  }

  async getContainerStatus(): Promise<ContainerStatus> {
    try {
      const status: ContainerStatus = {
        webodm: { running: false, healthy: false },
        nodeodm: { running: false, healthy: false }
      };

      // Check WebODM
      if (this.webodmContainer) {
        const webodmInfo = await this.webodmContainer.inspect();
        status.webodm.running = webodmInfo.State.Running;
        status.webodm.healthy = await this.checkWebODMHealth();
        status.webodm.port = this.config.webodmPort;
      }

      // Check NodeODM
      if (this.nodeodmContainer) {
        const nodeodmInfo = await this.nodeodmContainer.inspect();
        status.nodeodm.running = nodeodmInfo.State.Running;
        status.nodeodm.healthy = await this.checkNodeODMHealth();
        status.nodeodm.port = this.config.nodeodmPort;
      }

      return status;
    } catch (error) {
      this.logger.error('Failed to get container status', error);
      throw error;
    }
  }

  async checkWebODMHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.config.webodmPort}/api/`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkNodeODMHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.config.nodeodmPort}/info`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async restartUnhealthyContainers(): Promise<void> {
    const status = await this.getContainerStatus();
    
    if (status.webodm.running && !status.webodm.healthy) {
      this.logger.warn('WebODM container is unhealthy, restarting...');
      await this.restartWebODM();
    }
    
    if (status.nodeodm.running && !status.nodeodm.healthy) {
      this.logger.warn('NodeODM container is unhealthy, restarting...');
      await this.restartNodeODM();
    }
  }

  private async getContainerByName(name: string): Promise<Docker.Container | null> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const containerInfo = containers.find(c => c.Names.includes(`/${name}`));
      
      if (containerInfo) {
        return this.docker.getContainer(containerInfo.Id);
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get container ${name}`, error);
      return null;
    }
  }

  private async waitForWebODM(timeout: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.checkWebODMHealth()) {
        this.logger.info('WebODM is ready');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('WebODM failed to start within timeout');
  }

  private async waitForNodeODM(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.checkNodeODMHealth()) {
        this.logger.info('NodeODM is ready');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('NodeODM failed to start within timeout');
  }

  private async restartWebODM(): Promise<void> {
    if (this.webodmContainer) {
      await this.webodmContainer.restart();
      await this.waitForWebODM();
    }
  }

  private async restartNodeODM(): Promise<void> {
    if (this.nodeodmContainer) {
      await this.nodeodmContainer.restart();
      await this.waitForNodeODM();
    }
  }
}
