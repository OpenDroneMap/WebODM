import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { WebODMClient, Task } from '../../services/WebODMClient';
import { ProcessingManager, TaskProgress } from '../../services/ProcessingManager';
import { TaskQueue, QueuedTask } from '../../services/TaskQueue';

interface TaskMonitorProps {
  webodmClient: WebODMClient;
  processingManager: ProcessingManager;
  taskQueue: TaskQueue;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TaskMonitor: React.FC<TaskMonitorProps> = ({ webodmClient, processingManager, taskQueue }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [queuedTasks, setQueuedTasks] = useState<QueuedTask[]>([]);
  const [processingTasks, setProcessingTasks] = useState<QueuedTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<QueuedTask[]>([]);
  const [failedTasks, setFailedTasks] = useState<QueuedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<QueuedTask | null>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [taskProgress, setTaskProgress] = useState<Map<number, TaskProgress>>(new Map());

  useEffect(() => {
    loadTasks();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(loadTasks, 5000);
    return () => clearInterval(refreshInterval);
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pending, processing, completed, failed] = await Promise.all([
        taskQueue.getPendingTasks(),
        taskQueue.getProcessingTasks(),
        taskQueue.getCompletedTasks(50),
        taskQueue.getFailedTasks()
      ]);

      setQueuedTasks(pending);
      setProcessingTasks(processing);
      setCompletedTasks(completed);
      setFailedTasks(failed);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = async (taskId: string, action: string) => {
    try {
      switch (action) {
        case 'start':
          await taskQueue.markTaskProcessing(taskId);
          break;
        case 'pause':
          // Note: WebODM doesn't have pause functionality
          console.log('Pause not supported');
          break;
        case 'stop':
          await taskQueue.markTaskCancelled(taskId);
          break;
        case 'retry':
          await taskQueue.resetFailedTasks();
          break;
      }
      
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} task`);
    }
  };

  const handleViewTask = (task: QueuedTask) => {
    setSelectedTask(task);
    setTaskDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'processing': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <PlayIcon />;
      case 'completed': return <ViewIcon />;
      case 'failed': return <StopIcon />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderTaskTable = (tasks: QueuedTask[], showActions: boolean = true) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {task.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {task.images.length} images
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={task.status}
                  color={getStatusColor(task.status) as any}
                  size="small"
                  icon={getStatusIcon(task.status)}
                />
              </TableCell>
              <TableCell>
                {task.status === 'processing' && (
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress variant="indeterminate" />
                  </Box>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  {formatDate(task.createdAt)}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  <IconButton
                    size="small"
                    onClick={() => handleViewTask(task)}
                    color="primary"
                  >
                    <ViewIcon />
                  </IconButton>
                  
                  {showActions && (
                    <>
                      {task.status === 'pending' && (
                        <IconButton
                          size="small"
                          onClick={() => handleTaskAction(task.id, 'start')}
                          color="primary"
                        >
                          <PlayIcon />
                        </IconButton>
                      )}
                      
                      {task.status === 'processing' && (
                        <IconButton
                          size="small"
                          onClick={() => handleTaskAction(task.id, 'stop')}
                          color="error"
                        >
                          <StopIcon />
                        </IconButton>
                      )}
                      
                      {task.status === 'failed' && (
                        <IconButton
                          size="small"
                          onClick={() => handleTaskAction(task.id, 'retry')}
                          color="primary"
                        >
                          <RefreshIcon />
                        </IconButton>
                      )}
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Task Monitor
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadTasks}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`Queued (${queuedTasks.length})`} />
          <Tab label={`Processing (${processingTasks.length})`} />
          <Tab label={`Completed (${completedTasks.length})`} />
          <Tab label={`Failed (${failedTasks.length})`} />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {queuedTasks.length > 0 ? (
          renderTaskTable(queuedTasks)
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No queued tasks
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {processingTasks.length > 0 ? (
          renderTaskTable(processingTasks)
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No processing tasks
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {completedTasks.length > 0 ? (
          renderTaskTable(completedTasks, false)
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No completed tasks
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {failedTasks.length > 0 ? (
          renderTaskTable(failedTasks)
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No failed tasks
            </Typography>
          </Box>
        )}
      </TabPanel>

      <Dialog open={taskDetailsOpen} onClose={() => setTaskDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Task Details</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTask.name}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedTask.status}
                    color={getStatusColor(selectedTask.status) as any}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedTask.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Images
                  </Typography>
                  <Typography variant="body2">
                    {selectedTask.images.length} files
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Retry Count
                  </Typography>
                  <Typography variant="body2">
                    {selectedTask.retryCount} / {selectedTask.maxRetries}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedTask.lastError && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Error
                  </Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {selectedTask.lastError}
                  </Alert>
                </Box>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Processing Options
                </Typography>
                <Box component="pre" sx={{ 
                  bgcolor: 'grey.100', 
                  p: 1, 
                  borderRadius: 1, 
                  fontSize: '0.75rem',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(selectedTask.options, null, 2)}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskMonitor;
