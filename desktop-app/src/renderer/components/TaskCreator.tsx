import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Divider,
  Grid
} from '@mui/material';
import { CloudUpload as UploadIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { WebODMClient, Project } from '../../services/WebODMClient';
import { ProcessingManager } from '../../services/ProcessingManager';
import { TaskQueue } from '../../services/TaskQueue';

interface TaskCreatorProps {
  webodmClient: WebODMClient;
  processingManager: ProcessingManager;
  taskQueue: TaskQueue;
}

interface ProcessingOption {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select';
  defaultValue: any;
  options?: { value: any; label: string }[];
  description?: string;
}

const TaskCreator: React.FC<TaskCreatorProps> = ({ webodmClient, processingManager, taskQueue }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [taskName, setTaskName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingOptions, setProcessingOptions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const defaultProcessingOptions: ProcessingOption[] = [
    {
      key: 'pc-quality',
      label: 'Point Cloud Quality',
      type: 'select',
      defaultValue: 'high',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'ultra', label: 'Ultra' }
      ],
      description: 'Quality of the point cloud generation'
    },
    {
      key: 'mesh-octree-depth',
      label: 'Mesh Octree Depth',
      type: 'number',
      defaultValue: 9,
      description: 'Octree depth for mesh generation (higher = more detail)'
    },
    {
      key: 'mesh-size',
      label: 'Mesh Size',
      type: 'number',
      defaultValue: 200000,
      description: 'Maximum number of faces in the mesh'
    },
    {
      key: 'orthophoto-resolution',
      label: 'Orthophoto Resolution',
      type: 'number',
      defaultValue: 2,
      description: 'Resolution of the orthophoto in cm/pixel'
    },
    {
      key: 'dsm',
      label: 'Generate DSM',
      type: 'boolean',
      defaultValue: true,
      description: 'Generate Digital Surface Model'
    },
    {
      key: 'dtm',
      label: 'Generate DTM',
      type: 'boolean',
      defaultValue: false,
      description: 'Generate Digital Terrain Model'
    }
  ];

  useEffect(() => {
    loadProjects();
    initializeProcessingOptions();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await webodmClient.getProjects();
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  };

  const initializeProcessingOptions = () => {
    const options: Record<string, any> = {};
    defaultProcessingOptions.forEach(option => {
      options[option.key] = option.defaultValue;
    });
    setProcessingOptions(options);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessingOptionChange = (key: string, value: any) => {
    setProcessingOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateFiles = (files: File[]): string | null => {
    if (files.length === 0) {
      return 'Please select at least one image file';
    }

    const validExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif'];
    const invalidFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return !validExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
      return `Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`;
    }

    return null;
  };

  const handleCreateTask = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate inputs
      if (!selectedProject) {
        setError('Please select a project');
        return;
      }

      if (!taskName.trim()) {
        setError('Please enter a task name');
        return;
      }

      const validationError = validateFiles(selectedFiles);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Convert files to paths (in a real app, you'd handle file upload differently)
      const imagePaths = selectedFiles.map(file => file.path || file.name);

      // Add task to queue
      const taskId = await taskQueue.addTask(
        selectedProject as number,
        taskName.trim(),
        imagePaths,
        processingOptions
      );

      setSuccess(`Task created successfully! Task ID: ${taskId}`);
      
      // Reset form
      setTaskName('');
      setSelectedFiles([]);
      setSelectedProject('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const renderProcessingOption = (option: ProcessingOption) => {
    switch (option.type) {
      case 'number':
        return (
          <TextField
            key={option.key}
            label={option.label}
            type="number"
            value={processingOptions[option.key] || option.defaultValue}
            onChange={(e) => handleProcessingOptionChange(option.key, parseFloat(e.target.value))}
            fullWidth
            margin="dense"
            helperText={option.description}
          />
        );
      
      case 'boolean':
        return (
          <FormControl key={option.key} fullWidth margin="dense">
            <InputLabel>{option.label}</InputLabel>
            <Select
              value={processingOptions[option.key] || option.defaultValue}
              onChange={(e) => handleProcessingOptionChange(option.key, e.target.value)}
            >
              <MenuItem value={true}>Yes</MenuItem>
              <MenuItem value={false}>No</MenuItem>
            </Select>
            {option.description && (
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            )}
          </FormControl>
        );
      
      case 'select':
        return (
          <FormControl key={option.key} fullWidth margin="dense">
            <InputLabel>{option.label}</InputLabel>
            <Select
              value={processingOptions[option.key] || option.defaultValue}
              onChange={(e) => handleProcessingOptionChange(option.key, e.target.value)}
            >
              {option.options?.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {option.description && (
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            )}
          </FormControl>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Task
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
                Task Details
              </Typography>
              
              <FormControl fullWidth margin="dense">
                <InputLabel>Project</InputLabel>
                <Select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value as number)}
                >
                  {projects.map(project => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Task Name"
                fullWidth
                margin="dense"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter a descriptive name for this task"
              />
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Image Files
              </Typography>
              
              <Box mb={2}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="file-input"
                  multiple
                  type="file"
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    fullWidth
                  >
                    Select Images
                  </Button>
                </label>
              </Box>

              {selectedFiles.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Files ({selectedFiles.length})
                  </Typography>
                  <List dense>
                    {selectedFiles.map((file, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={file.name}
                          secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleFileRemove(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Processing Options
              </Typography>
              
              {defaultProcessingOptions.map(option => renderProcessingOption(option))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          size="large"
          onClick={handleCreateTask}
          disabled={loading || !selectedProject || !taskName.trim() || selectedFiles.length === 0}
        >
          {loading ? 'Creating Task...' : 'Create Task'}
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mt: 2 }} />}
    </Box>
  );
};

export default TaskCreator;
