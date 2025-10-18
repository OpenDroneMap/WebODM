import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, AppBar, Toolbar, Typography, Button, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

// Components
import ProjectList from './components/ProjectList';
import TaskCreator from './components/TaskCreator';
import TaskMonitor from './components/TaskMonitor';
import Settings from './components/Settings';
import StatusBar from './components/StatusBar';

// Services
import { WebODMClient } from '../services/WebODMClient';
import { DockerManager } from '../services/DockerManager';
import { ProcessingManager } from '../services/ProcessingManager';
import { TaskQueue } from '../services/TaskQueue';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: theme.spacing(8),
}));

interface AppState {
  isConnected: boolean;
  containerStatus: {
    webodm: { running: boolean; healthy: boolean };
    nodeodm: { running: boolean; healthy: boolean };
  };
  currentView: string;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    isConnected: false,
    containerStatus: {
      webodm: { running: false, healthy: false },
      nodeodm: { running: false, healthy: false }
    },
    currentView: 'projects'
  });

  const [webodmClient] = useState(() => new WebODMClient());
  const [dockerManager] = useState(() => new DockerManager());
  const [processingManager] = useState(() => new ProcessingManager(webodmClient));
  const [taskQueue] = useState(() => new TaskQueue());

  useEffect(() => {
    initializeApp();
    
    // Set up periodic health checks
    const healthCheckInterval = setInterval(checkHealth, 30000);
    
    return () => {
      clearInterval(healthCheckInterval);
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Start Docker containers
      await dockerManager.startWebODM();
      await dockerManager.startNodeODM();
      
      // Check health
      await checkHealth();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const containerStatus = await dockerManager.getContainerStatus();
      const isConnected = await webodmClient.healthCheck();
      
      setAppState(prev => ({
        ...prev,
        isConnected,
        containerStatus
      }));
      
      // Restart unhealthy containers
      if (containerStatus.webodm.running && !containerStatus.webodm.healthy) {
        console.warn('WebODM container is unhealthy, restarting...');
        await dockerManager.restartUnhealthyContainers();
      }
      
    } catch (error) {
      console.error('Health check failed:', error);
      setAppState(prev => ({
        ...prev,
        isConnected: false
      }));
    }
  };

  const handleViewChange = (view: string) => {
    setAppState(prev => ({
      ...prev,
      currentView: view
    }));
  };

  const renderCurrentView = () => {
    switch (appState.currentView) {
      case 'projects':
        return <ProjectList webodmClient={webodmClient} />;
      case 'create-task':
        return <TaskCreator 
          webodmClient={webodmClient} 
          processingManager={processingManager}
          taskQueue={taskQueue}
        />;
      case 'monitor':
        return <TaskMonitor 
          webodmClient={webodmClient}
          processingManager={processingManager}
          taskQueue={taskQueue}
        />;
      case 'settings':
        return <Settings 
          dockerManager={dockerManager}
          webodmClient={webodmClient}
        />;
      default:
        return <ProjectList webodmClient={webodmClient} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <StyledAppBar position="fixed">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                WebODM Desktop
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                <Chip 
                  label={appState.containerStatus.webodm.healthy ? 'WebODM Online' : 'WebODM Offline'}
                  color={appState.containerStatus.webodm.healthy ? 'success' : 'error'}
                  size="small"
                />
                <Chip 
                  label={appState.containerStatus.nodeodm.healthy ? 'NodeODM Online' : 'NodeODM Offline'}
                  color={appState.containerStatus.nodeodm.healthy ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              
              <Button 
                color="inherit" 
                onClick={() => handleViewChange('projects')}
                variant={appState.currentView === 'projects' ? 'outlined' : 'text'}
              >
                Projects
              </Button>
              <Button 
                color="inherit" 
                onClick={() => handleViewChange('create-task')}
                variant={appState.currentView === 'create-task' ? 'outlined' : 'text'}
              >
                Create Task
              </Button>
              <Button 
                color="inherit" 
                onClick={() => handleViewChange('monitor')}
                variant={appState.currentView === 'monitor' ? 'outlined' : 'text'}
              >
                Monitor
              </Button>
              <Button 
                color="inherit" 
                onClick={() => handleViewChange('settings')}
                variant={appState.currentView === 'settings' ? 'outlined' : 'text'}
              >
                Settings
              </Button>
            </Toolbar>
          </StyledAppBar>
          
          <MainContent>
            {renderCurrentView()}
          </MainContent>
          
          <StatusBar 
            isConnected={appState.isConnected}
            containerStatus={appState.containerStatus}
            onRefresh={checkHealth}
          />
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
