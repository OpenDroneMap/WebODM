import React, { useState, useEffect, useCallback } from 'react';
import './Tasks.css';
import ProjectViewer from "./ProjectContainer.jsx";
import Export from './Export.jsx';
import { authorizedFetch } from '../utils/api.js';

// New TaskBox component with thumbnail hover functionality
const TaskBox = ({ task, onAction, onShowDeleteDialog, fetchJSON, isDeleteDialogOpen = false, openExportTaskId, setOpenExportTaskId }) => {
  const [lastError, setLastError] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  const fetchLastError = useCallback(async () => {
    if (task.status === 30) {
      try {
        const response = await fetchJSON(`/api/projects/${task.projectId}/tasks/${task.id}/`);
        setLastError(response.last_error || "No error details available");
      } catch (err) {
        console.error("Failed to fetch last error:", err);
      }
    }
  }, [task, fetchJSON]);

  const fetchThumbnail = useCallback(() => {
    if (task.status === 40 && !thumbnailUrl) {
      const url = `/api/projects/${task.projectId}/tasks/${task.id}/thumbnail?size=164`;
      setThumbnailUrl(url);
    }
  }, [task, thumbnailUrl]);

  useEffect(() => {
    fetchLastError();
  }, [fetchLastError]);

  const getStatusText = (statusCode) => {
    switch (statusCode) {
      case 10: return 'QUEUED';
      case 20: return 'RUNNING';
      case 30: return 'FAILED';
      case 40: return 'COMPLETED';
      case 50: return 'CANCELED';
      default: return 'RUNNING';
    }
  };

  const getStatusClass = (statusCode) => {
    switch (statusCode) {
      case 10: return 'status-queued';
      case 20: return 'status-running';
      case 30: return 'status-failed';
      case 40: return 'status-completed';
      case 50: return 'status-canceled';
      default: return 'status-running';
    }
  };

  const handleAction = (actionType) => {
    onAction(task, actionType);
  };

  const effectiveStatus = task.status === null ? 20 : task.status;

  return (
    <div 
      className={`task-box ${getStatusClass(effectiveStatus)}`}
      onMouseEnter={() => {
        setIsHovering(true);
        fetchThumbnail();
      }}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="main-content-area">
        <div className="task-header">
            <h3>{task.projectName}</h3>
            <div className="task-status-info">
                <span className={`status-badge ${getStatusClass(effectiveStatus)}`}>
                    {getStatusText(effectiveStatus)}
                </span>
                <span className="task-id">ID: {task.id}</span>
            </div>
        </div>
        <div className="task-content">
            <p className="task-name">{task.taskName}</p>
            {effectiveStatus === 30 && lastError && (
              <p className="task-error"><strong>Error:</strong> {lastError}</p>
            )}
            {effectiveStatus === 20 && (
              <div className="task-progress">
                <div className="progress-info">
                  <span>
                    {task.running_progress === 0 ? 'Uploading and Resizing...' : `Progress: ${task.progressPct}%`}
                  </span>
                </div>
                {task.running_progress > 0 && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${task.progressPct}%`,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
        </div>
        <div className="task-actions">
            {effectiveStatus === 20 && (
                <>
                <button className="btn-cancel" onClick={() => onShowDeleteDialog({ ...task, actionType: 'cancel' })}>Cancel</button>
                <button className="btn-delete" onClick={() => onShowDeleteDialog({ ...task, actionType: 'delete' })}>Delete</button>
                </>
            )}
            {effectiveStatus === 40 && (
                <>
                <button className="btn-view" onClick={() => handleAction('view')}>View</button>
                <Export 
                  projectId={task.projectId} 
                  taskId={task.id} 
                  openExportTaskId={openExportTaskId} 
                  setOpenExportTaskId={setOpenExportTaskId} 
                />
                <button className="btn-delete" onClick={() => onShowDeleteDialog({ ...task, actionType: 'delete' })}>Delete</button>
                </>
            )}
            {effectiveStatus === 30 && (
                <>
                <button className="btn-restart" onClick={() => handleAction('restart')}>Restart</button>
                <button className="btn-delete" onClick={() => onShowDeleteDialog({ ...task, actionType: 'delete' })}>Delete</button>
                </>
            )}
            {effectiveStatus === 50 && (
                <>
                <button className="btn-restart" onClick={() => handleAction('restart')}>Restart</button>
                <button className="btn-delete" onClick={() => onShowDeleteDialog({ ...task, actionType: 'delete' })}>Delete</button>
                </>
            )}
            {effectiveStatus === 10 && (
                <>
                <button className="btn-cancel" onClick={() => onShowDeleteDialog({ ...task, actionType: 'cancel' })}>Cancel</button>
                <button className="btn-delete" onClick={() => onShowDeleteDialog({ ...task, actionType: 'delete' })}>Delete</button>
                </>
            )}
        </div>
      </div>
      {/* Thumbnail container outside the main content but inside the task-box */}
      {isHovering && effectiveStatus === 40 && thumbnailUrl && (
        <div className="task-thumbnail-wrapper">
          <button
            type="button"
            className="thumbnail-button"
            onClick={() => handleAction('view')}
            title="View"
          >
            <img src={thumbnailUrl} alt={`Thumbnail for task ${task.id}`} className="task-thumbnail" />
          </button>
        </div>
      )}
    </div>
  );
};

// Main Tasks component
const Tasks = ({ runningTasks, loading, onRefresh, onTaskAction ,isViewing,exitView,selectedTask, filterProjectId, setFilterProjectId, projects }) => {
  const [deleteDialogTask, setDeleteDialogTask] = useState(null);
  const [filterProjectName, setFilterProjectName] = useState(null);
  // Share delete dialog state with child components
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // Add state to track the currently open Export dropdown
  const [openExportTaskId, setOpenExportTaskId] = useState(null);

  useEffect(() => {
    if (filterProjectId) {
      const project = projects.find(proj => proj.id === filterProjectId);
      setFilterProjectName(project ? project.name : null);
    } else {
      setFilterProjectName(null);
    }
  }, [filterProjectId, projects]);

  const handleDialogAction = (task, actionType) => {
    onTaskAction(task, actionType);
    setDeleteDialogTask(null);
    setIsDeleteDialogOpen(false);
  };

  const showDeleteDialog = (task) => {
    setDeleteDialogTask(task);
    setIsDeleteDialogOpen(true);
  };

  const onClearFilter = () => {
    setFilterProjectId(null);
    setFilterProjectName(null);
    onRefresh(); 
  };

  const categorizeTasks = (tasks) => {
    const categories = {
        running: [],
        completed: [],
        failed: [],
        canceled: [],
        queued: []
    };

    tasks.forEach(task => {
        const effectiveStatus = task.status === null ? 20 : task.status;
        
        switch (effectiveStatus) {
            case 20: categories.running.push({...task, status: effectiveStatus}); break;
            case 40: categories.completed.push({...task, status: effectiveStatus}); break;
            case 30: categories.failed.push({...task, status: effectiveStatus}); break;
            case 50: categories.canceled.push({...task, status: effectiveStatus}); break;
            case 10: categories.queued.push({...task, status: effectiveStatus}); break;
            default: categories.running.push({...task, status: 20}); break;
        }
    });
    return categories;
  };

  const categorizedTasks = categorizeTasks(runningTasks);
  const memoizedAuthorizedFetch = useCallback(authorizedFetch, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.export-container')) {
        setOpenExportTaskId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  if(!isViewing) {
    return (
      <div className="tasks-container">
        <div className="view-header">
          <h2>Tasks</h2>
          {filterProjectName && (
            <div className="filter-info">
              <span>Filter: {filterProjectName}</span>
              <button className="clear-filter" onClick={() => onClearFilter()}>✖</button>
            </div>
          )}
          <button className="refresh-button" onClick={onRefresh}>
            🔄 Refresh
          </button>
        </div>
        
        {loading ? (
          <p className="loading">Loading tasks...</p>
        ) : runningTasks.length === 0 ? (
          <p className="no-tasks">No tasks found.</p>
        ) : (
          <>
            {categorizedTasks.running.length > 0 && (
              <div className="task-category">
                <h3>Running Tasks ({categorizedTasks.running.length})</h3>
                <div className="tasks-grid">
                  {categorizedTasks.running.map((task) => (
                    <TaskBox 
                      key={task.id} 
                      task={task} 
                      onAction={onTaskAction}
                      onShowDeleteDialog={showDeleteDialog}
                      fetchJSON={memoizedAuthorizedFetch}
                      isDeleteDialogOpen={isDeleteDialogOpen}
                      openExportTaskId={openExportTaskId}
                      setOpenExportTaskId={setOpenExportTaskId}
                    />
                  ))}
                </div>
              </div>
            )}
            {categorizedTasks.completed.length > 0 && (
              <div className="task-category">
                <h3>Completed Tasks ({categorizedTasks.completed.length})</h3>
                <div className="tasks-grid">
                  {categorizedTasks.completed.map((task) => (
                    <TaskBox 
                      key={task.id} 
                      task={task} 
                      onAction={onTaskAction}
                      onShowDeleteDialog={showDeleteDialog}
                      fetchJSON={memoizedAuthorizedFetch}
                      isDeleteDialogOpen={isDeleteDialogOpen}
                      openExportTaskId={openExportTaskId}
                      setOpenExportTaskId={setOpenExportTaskId}
                    />
                  ))}
                </div>
              </div>
            )}
            {categorizedTasks.failed.length > 0 && (
              <div className="task-category">
                <h3>Failed Tasks ({categorizedTasks.failed.length})</h3>
                <div className="tasks-grid">
                  {categorizedTasks.failed.map((task) => (
                    <TaskBox 
                      key={task.id} 
                      task={task} 
                      onAction={onTaskAction}
                      onShowDeleteDialog={showDeleteDialog}
                      fetchJSON={memoizedAuthorizedFetch}
                      isDeleteDialogOpen={isDeleteDialogOpen}
                      openExportTaskId={openExportTaskId}
                      setOpenExportTaskId={setOpenExportTaskId}
                    />
                  ))}
                </div>
              </div>
            )}
            {categorizedTasks.canceled.length > 0 && (
              <div className="task-category">
                <h3>Canceled Tasks ({categorizedTasks.canceled.length})</h3>
                <div className="tasks-grid">
                  {categorizedTasks.canceled.map((task) => (
                    <TaskBox 
                      key={task.id} 
                      task={task} 
                      onAction={onTaskAction}
                      onShowDeleteDialog={showDeleteDialog}
                      fetchJSON={memoizedAuthorizedFetch}
                      isDeleteDialogOpen={isDeleteDialogOpen}
                      openExportTaskId={openExportTaskId}
                      setOpenExportTaskId={setOpenExportTaskId}
                    />
                  ))}
                </div>
              </div>
            )}
            {categorizedTasks.queued.length > 0 && (
              <div className="task-category">
                <h3>Queued Tasks ({categorizedTasks.queued.length})</h3>
                <div className="tasks-grid">
                  {categorizedTasks.queued.map((task) => (
                    <TaskBox 
                      key={task.id} 
                      task={task} 
                      onAction={onTaskAction}
                      onShowDeleteDialog={showDeleteDialog}
                      fetchJSON={memoizedAuthorizedFetch}
                      openExportTaskId={openExportTaskId}
                      setOpenExportTaskId={setOpenExportTaskId}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {deleteDialogTask && (
          <div className="modal-overlay">
            <div className="dialog">
              <p>Are you sure you want to {deleteDialogTask.actionType === 'cancel' ? 'cancel' : 'delete'} this task?</p>
              <div className="delete-dialog-actions">
                <button onClick={() => { handleDialogAction(deleteDialogTask, deleteDialogTask.actionType); }} className="delete-dialog-btn">Yes</button>
                <button onClick={() => {
                  setDeleteDialogTask(null);
                  setIsDeleteDialogOpen(false);
                }} className="delete-dialog-btn no">No</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    return (<ProjectViewer project_details={selectedTask} exit={exitView}/>);
  }
};

export default Tasks;