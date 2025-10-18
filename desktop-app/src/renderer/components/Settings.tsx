import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon
} from '@mui/icons-material';
import { DockerManager, ContainerStatus } from '../../services/DockerManager';
import { WebODMClient } from '../../services/WebODMClient';

interface SettingsProps {
  dockerManager: DockerManager;
  webodmClient: WebODMClient;
}

interface AppSettings {
  autoStart: boolean;
  maxConcurrentTasks: number;
  retryAttempts: number;
  retryDelay: number;
  dataDirectory: string;
  webodmPort: number;
  nodeodmPort: number;
}

const Settings: React.FC<SettingsProps> = ({ dockerManager, webodmClient }) => {
  const [settings, setSettings] = useState<AppSettings>({
    autoStart: true,
    maxConcurrentTasks: 3,
    retryAttempts: 3,
    retryDelay: 5000,
    dataDirectory: '~/.webodm-desktop',
    webodmPort: 8000,
    nodeodmPort: 3000
  });

  const [containerStatus, setContainerStatus] = useState<ContainerStatus>({
    webodm: { running: false, healthy: false },
    nodeodm: { running: false, healthy: false }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    checkContainerStatus();
  }, []);

  const loadSettings = async () => {
    try {
      // In a real app, you'd load from a config file
      // For now, we'll use default values
      console.log('Loading settings...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, you'd save to a config file
      console.log('Saving settings:', settings);
      
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const checkContainerStatus = async () => {
    try {
      const status = await dockerManager.getContainerStatus();
      setContainerStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check container status');
    }
  };

  const handleContainerAction = async (action: string) => {
    try {
      setLoading(true);
      setError(null);

      switch (action) {
        case 'start':
          await dockerManager.startWebODM();
          await dockerManager.startNodeODM();
          setSuccess('Containers started successfully');
          break;
        case 'stop':
          await dockerManager.stopContainers();
          setSuccess('Containers stopped successfully');
          break;
        case 'restart':
          await dockerManager.stopContainers();
          await new Promise(resolve => setTimeout(resolve, 2000));
          await dockerManager.startWebODM();
          await dockerManager.startNodeODM();
          setSuccess('Containers restarted successfully');
          break;
      }

      await checkContainerStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} containers`);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatusColor = (running: boolean, healthy: boolean) => {
    if (!running) return 'error';
    if (running && healthy) return 'success';
    return 'warning';
  };

  const getStatusText = (running: boolean, healthy: boolean) => {
    if (!running) return 'Stopped';
    if (running && healthy) return 'Running';
    return 'Unhealthy';
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Container Status
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="WebODM"
                    secondary={`Port: ${settings.webodmPort}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getStatusText(containerStatus.webodm.running, containerStatus.webodm.healthy)}
                      color={getStatusColor(containerStatus.webodm.running, containerStatus.webodm.healthy) as any}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="NodeODM"
                    secondary={`Port: ${settings.nodeodmPort}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getStatusText(containerStatus.nodeodm.running, containerStatus.nodeodm.healthy)}
                      color={getStatusColor(containerStatus.nodeodm.running, containerStatus.nodeodm.healthy) as any}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>

              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={() => handleContainerAction('start')}
                  disabled={loading}
                  size="small"
                >
                  Start
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  onClick={() => handleContainerAction('stop')}
                  disabled={loading}
                  size="small"
                >
                  Stop
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RestartIcon />}
                  onClick={() => handleContainerAction('restart')}
                  disabled={loading}
                  size="small"
                >
                  Restart
                </Button>
                <IconButton
                  onClick={checkContainerStatus}
                  disabled={loading}
                  size="small"
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Application Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoStart}
                    onChange={(e) => handleSettingChange('autoStart', e.target.checked)}
                  />
                }
                label="Auto-start containers on app launch"
              />
              
              <TextField
                label="Max Concurrent Tasks"
                type="number"
                value={settings.maxConcurrentTasks}
                onChange={(e) => handleSettingChange('maxConcurrentTasks', parseInt(e.target.value))}
                fullWidth
                margin="dense"
                inputProps={{ min: 1, max: 10 }}
              />
              
              <TextField
                label="Retry Attempts"
                type="number"
                value={settings.retryAttempts}
                onChange={(e) => handleSettingChange('retryAttempts', parseInt(e.target.value))}
                fullWidth
                margin="dense"
                inputProps={{ min: 1, max: 10 }}
              />
              
              <TextField
                label="Retry Delay (ms)"
                type="number"
                value={settings.retryDelay}
                onChange={(e) => handleSettingChange('retryDelay', parseInt(e.target.value))}
                fullWidth
                margin="dense"
                inputProps={{ min: 1000, max: 60000 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network Settings
              </Typography>
              
              <TextField
                label="WebODM Port"
                type="number"
                value={settings.webodmPort}
                onChange={(e) => handleSettingChange('webodmPort', parseInt(e.target.value))}
                fullWidth
                margin="dense"
                inputProps={{ min: 1024, max: 65535 }}
              />
              
              <TextField
                label="NodeODM Port"
                type="number"
                value={settings.nodeodmPort}
                onChange={(e) => handleSettingChange('nodeodmPort', parseInt(e.target.value))}
                fullWidth
                margin="dense"
                inputProps={{ min: 1024, max: 65535 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Settings
              </Typography>
              
              <TextField
                label="Data Directory"
                value={settings.dataDirectory}
                onChange={(e) => handleSettingChange('dataDirectory', e.target.value)}
                fullWidth
                margin="dense"
                helperText="Directory where WebODM data will be stored"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={saveSettings}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
