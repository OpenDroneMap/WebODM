import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "./Project_box.css";
import { authorizedFetch } from '../utils/api.js';

const ProjectBox = ({ project, onAddTask, onEditProject, onShowDeleteDialog, changeView, refreshTasks }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);
  const [editedDescription, setEditedDescription] = useState(project.description || "");
  const [hasTasks, setHasTasks] = useState(false);

  useEffect(() => {
    // Check if the project has tasks
    const fetchTasks = async () => {
      try {
        const response = await authorizedFetch(`/api/projects/${project.id}/tasks/`);
        const tasks = await response.json();
        setHasTasks(tasks.length > 0);
      } catch (err) {
        console.error("Failed to fetch tasks: " + err.message);
      }
    };

    fetchTasks();
  }, [project.id, refreshTasks]); // Added refreshTasks as a dependency to re-run useEffect when tasks are updated

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const response = await authorizedFetch(`/api/projects/${project.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editedName,
          description: editedDescription
        })
      });
      const updatedProject = await response.json();
      onEditProject(project.id, updatedProject);
      setIsEditing(false);
    } catch (err) {
      console.log("Failed to update project: " + err.message);
    }
  };

  const handleCancel = () => {
    setEditedName(project.name);
    setEditedDescription(project.description || "");
    setIsEditing(false);
  };

  return (
    <div className="project-box">
      {isEditing ? (
        <>
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="edit-input"
            placeholder="Project Name"
          />
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="edit-textarea"
            placeholder="Project Description"
            rows="3"
          />
          <div className="project-actions">
            <div className="save-link" onClick={handleSave}>
              💾 Save
            </div>
            <div className="cancel-link" onClick={handleCancel}>
              ❌ Cancel
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="project-title">{project.name}</div>
          <div className="project-description">
            {project.description || "No description provided"}
          </div>
          <div className="project-actions">
            <div className="edit-link" onClick={handleEdit}>
              ✏️ Edit
            </div>
            <div className="task-link" onClick={() => onAddTask(project.id)}>
              ➕ Task
            </div>
            <div className="delete-link" onClick={() => onShowDeleteDialog(project)}>
              🗑️ Delete
            </div>
            {hasTasks && (
              <div className="view-task-link" onClick={() => changeView("tasks", project.id)}>
                👁️ View Tasks
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectBox;