# WebODM Desktop

A desktop application wrapper for WebODM that provides a user-friendly interface for drone image processing while maintaining AGPL compliance through proper component separation.

## Features

- **Desktop Interface**: Native desktop application built with Electron and React
- **Docker Integration**: Automatic management of WebODM and NodeODM containers
- **Task Management**: Create, monitor, and manage processing tasks
- **Reliability**: Built-in retry logic, fault tolerance, and error recovery
- **File Support**: Comprehensive image format validation and processing
- **Progress Tracking**: Real-time monitoring of processing status
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Architecture

The application maintains AGPL compliance by treating WebODM and NodeODM as isolated services:

- **Desktop App**: Custom UI (can be proprietary)
- **WebODM Backend**: Running in Docker, accessed via REST API
- **NodeODM Processing**: Isolated in Docker container(s)
- **Communication**: REST API only (maintains license separation)

## Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose
- Git

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd desktop-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

## Development

### Development Mode

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Package for distribution
npm run pack
```

### Project Structure

```
desktop-app/
├── src/
│   ├── main/                 # Electron main process
│   │   └── index.ts
│   ├── renderer/             # React UI
│   │   ├── components/       # React components
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── services/             # Business logic
│   │   ├── DockerManager.ts
│   │   ├── WebODMClient.ts
│   │   ├── ProcessingManager.ts
│   │   ├── TaskQueue.ts
│   │   └── FileHandler.ts
│   └── utils/                # Utilities
│       └── Logger.ts
├── package.json
├── webpack.main.config.js
├── webpack.renderer.config.js
└── docker-compose.yml
```

## Usage

### Starting the Application

1. Launch the desktop application
2. The app will automatically start Docker containers for WebODM and NodeODM
3. Wait for the containers to be healthy (status indicators in the status bar)

### Creating a Project

1. Go to the "Projects" tab
2. Click "New Project"
3. Enter project name and description
4. Click "Create"

### Processing Images

1. Go to the "Create Task" tab
2. Select a project
3. Enter task name
4. Select image files (drag & drop or file picker)
5. Configure processing options
6. Click "Create Task"

### Monitoring Tasks

1. Go to the "Monitor" tab
2. View task status in real-time
3. Monitor progress and logs
4. Download results when complete

## Configuration

### Application Settings

Access settings through the "Settings" tab:

- **Auto-start**: Automatically start containers on app launch
- **Max Concurrent Tasks**: Maximum number of simultaneous processing tasks
- **Retry Settings**: Configure retry attempts and delays
- **Network Settings**: Configure ports for WebODM and NodeODM
- **Storage Settings**: Set data directory location

### Docker Configuration

The application uses Docker Compose for container management:

```yaml
# docker-compose.yml
services:
  webodm:
    image: opendronemap/webodm_webapp:latest
    ports:
      - "8000:8000"
  
  nodeodm:
    image: opendronemap/nodeodm:latest
    ports:
      - "3000:3000"
```

## Troubleshooting

### Container Issues

1. **Containers won't start**:
   - Check Docker is running
   - Verify ports 8000 and 3000 are available
   - Check Docker logs: `docker logs webodm-desktop`

2. **WebODM unhealthy**:
   - Restart containers from Settings tab
   - Check disk space (WebODM needs significant storage)
   - Verify Docker resources (CPU, memory)

3. **NodeODM connection issues**:
   - Ensure NodeODM container is running
   - Check network connectivity
   - Verify port 3000 is accessible

### Task Processing Issues

1. **Tasks stuck in queue**:
   - Check NodeODM container health
   - Verify processing node is online
   - Check available disk space

2. **Task failures**:
   - Review task logs in Monitor tab
   - Check image file formats and sizes
   - Verify processing options are valid

3. **Slow processing**:
   - Check system resources (CPU, memory)
   - Consider reducing concurrent tasks
   - Verify Docker resource limits

## File Formats

### Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- TIFF (.tiff, .tif)
- BMP (.bmp)
- WebP (.webp)

### File Requirements

- Maximum file size: 100MB per image
- Minimum dimensions: 100x100 pixels
- GPS data recommended for better georeferencing

## License Compliance

This desktop application maintains AGPL compliance through:

1. **Component Separation**: WebODM and NodeODM run in isolated Docker containers
2. **API Communication**: Only REST API calls, no code modification
3. **Clear Boundaries**: Desktop app is a separate work from WebODM/NodeODM
4. **Documentation**: Architecture clearly documented

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review application logs in `~/.webodm-desktop/logs/`
3. Check Docker container logs
4. Create an issue with detailed information

## Roadmap

- [ ] Enhanced result visualization
- [ ] Batch processing improvements
- [ ] Advanced processing options
- [ ] Plugin system for custom workflows
- [ ] Cloud storage integration
- [ ] Multi-node processing support
