import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as OnlineIcon,
  Error as OfflineIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface StatusBarProps {
  isConnected: boolean;
  containerStatus: {
    webodm: { running: boolean; healthy: boolean };
    nodeodm: { running: boolean; healthy: boolean };
  };
  onRefresh: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ isConnected, containerStatus, onRefresh }) => {
  const getStatusIcon = (running: boolean, healthy: boolean) => {
    if (!running) return <OfflineIcon color="error" />;
    if (running && healthy) return <OnlineIcon color="success" />;
    return <WarningIcon color="warning" />;
  };

  const getStatusText = (running: boolean, healthy: boolean) => {
    if (!running) return 'Offline';
    if (running && healthy) return 'Online';
    return 'Unhealthy';
  };

  const getStatusColor = (running: boolean, healthy: boolean) => {
    if (!running) return 'error';
    if (running && healthy) return 'success';
    return 'warning';
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        bgcolor: 'grey.100',
        borderTop: 1,
        borderColor: 'grey.300',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        zIndex: 1000
      }}
    >
      <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
        <Typography variant="caption" color="text.secondary">
          WebODM Desktop
        </Typography>
        
        <Chip
          icon={getStatusIcon(containerStatus.webodm.running, containerStatus.webodm.healthy)}
          label={`WebODM: ${getStatusText(containerStatus.webodm.running, containerStatus.webodm.healthy)}`}
          color={getStatusColor(containerStatus.webodm.running, containerStatus.webodm.healthy) as any}
          size="small"
        />
        
        <Chip
          icon={getStatusIcon(containerStatus.nodeodm.running, containerStatus.nodeodm.healthy)}
          label={`NodeODM: ${getStatusText(containerStatus.nodeodm.running, containerStatus.nodeodm.healthy)}`}
          color={getStatusColor(containerStatus.nodeodm.running, containerStatus.nodeodm.healthy) as any}
          size="small"
        />
      </Box>
      
      <Tooltip title="Refresh Status">
        <IconButton size="small" onClick={onRefresh}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default StatusBar;
