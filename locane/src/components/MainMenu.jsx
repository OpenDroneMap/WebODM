import Sidebar from './Sidebar.jsx';
import "./mainmenu.css"
import CreateNewTask from "./CreateTask.jsx";
import React, {useCallback, useEffect, useState} from "react";
import Projects from "./Projects";
import Tasks from "./Tasks";
import GcpInterface from './GcpInterface.jsx';
import NewProject from './NewProject.jsx';
import Export from './Export.jsx'
import { authorizedFetch } from '../utils/api.js';
import Admin from './Admin.jsx';
import { getCookie } from '../utils/cookieUtils';
// logoutSession removed; using authorizedFetch directly

export default function MainMenu(props) {
    const [activeView, setActiveView] = useState("dash");
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [runningTasks, setRunningTasks] = useState([]);
    const [exportTask, setExportTask] = useState(null);
    const [activeDialog, setActiveDialog] = useState("none");
    const [isViewing,setViewing] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    const [selectedTask, setSelectedTask] = useState(null);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [filterProjectId, setFilterProjectId] = useState(null);


    const API_BASE = "/api";
    const API_PROJECTS = `${API_BASE}/projects`;

    const fetchJSON = useCallback(async (url, opts = {}) => {
        const res = await authorizedFetch(url, { ...opts });
        return res.json();
    }, []);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchJSON(`${API_PROJECTS}/`);
            const list = Array.isArray(data?.results) ? data.results : data;
            setProjects(list || []);
        } catch (err) {
            console.error("Fetch projects failed:", err);
        } finally {
            setLoading(false);
        }
    }, [fetchJSON]);



    const loadRunningTasksStructure = useCallback(async () => {
        setLoading(true);
        try {
            const projResp = await fetchJSON(`${API_PROJECTS}/`);
            const projList = Array.isArray(projResp?.results) ? projResp.results : projResp;
            const projMap = new Map((projList || []).map((p) => [p.id, p.name]));

            const perProjectTaskRefs = await Promise.all(
                (projList || []).map(async (p) => {
                    try {
                        const list = await fetchJSON(`${API_PROJECTS}/${p.id}/tasks/`);
                        const tasksArr = Array.isArray(list?.results) ? list.results : list;
                        return (tasksArr || []).map((t) => ({
                            projectId: p.id,
                            taskId: t.id,
                            projectName: projMap.get(p.id) || `Project ${p.id}`,
                            taskName: t.name,
                            status: t.status,
                            running_progress: t.running_progress || 0 // Add running_progress
                        }));
                    } catch (e) {
                        console.warn("List tasks failed for project", p.id, e);
                        return [];
                    }
                })
            );

            const flatRefs = perProjectTaskRefs.flat();
            // Include ALL tasks, not just non-completed ones
            const shaped = flatRefs.map((task) => ({
                id: task.taskId,
                projectId: task.projectId,
                projectName: task.projectName,
                taskName: task.taskName,
                progressPct: 0,
                status: task.status,
            }));

            setRunningTasks(shaped);
            return shaped;
        } catch (e) {
            console.error("loadRunningTasksStructure failed:", e);
            setRunningTasks([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [fetchJSON]);

    const updateRunningTasksProgress = useCallback(async () => {
        try {
            // Create an array to hold the results of all fetch promises
            const fetchPromises = runningTasks.map(async (task) => {
                try {
                    // Use authorizedFetch to get the raw response
                    const res = await authorizedFetch(`${API_PROJECTS}/${task.projectId}/tasks/${task.id}/`);
    
                    // Check for a 404 status code directly
                    if (res.status === 404) {
                        console.warn(`Task ${task.id} not found (404), removing from list.`);
                        // Return null to signal that this task should be removed from the list
                        return null;
                    }
    
                    // If the status is not 404, parse the JSON
                    const taskDetail = await res.json();
                    
                    const taskStatus = taskDetail.status === null ? 20 : taskDetail.status;
                    const progressPct = Math.round((taskDetail.running_progress || 0) * 100);
    
                    // Return the updated task object
                    return {
                        ...task,
                        progressPct,
                        status: taskStatus,
                        running_progress: taskDetail.running_progress || 0
                    };
                } catch (e) {
                    // This catch block handles network errors or JSON parsing errors, but not 404s
                    console.warn(`Progress update failed for task ${task.id}:`, e);
                    return {
                        ...task,
                        progressPct: 100,
                        // Set status to failed (30) on other errors for clarity
                        status: 30
                    };
                }
            });
    
            const results = await Promise.all(fetchPromises);
            
            // Filter out any tasks that returned null (i.e., those that were deleted)
            const updatedTasks = results.filter(task => task !== null);
            
            // Compare the new list to the old list to avoid unnecessary re-renders
            if (JSON.stringify(updatedTasks) !== JSON.stringify(runningTasks)) {
                setRunningTasks(updatedTasks);
            }
        } catch (e) {
            console.error("updateRunningTasksProgress failed:", e);
        }
    }, [runningTasks, fetchJSON]);

    const handleTaskAction = useCallback(async (task, actionType) => {
        try {
            switch (actionType) {
                case 'cancel':
                    await fetchJSON(`${API_PROJECTS}/${task.projectId}/tasks/${task.id}/cancel/`, {
                        method: 'POST'
                    });
                    break;
                case 'delete':
                    await fetchJSON(`${API_PROJECTS}/${task.projectId}/tasks/${task.id}/remove/`, {
                        method: 'POST'
                    });
                    break;
                case 'view':

                    setSelectedTask(task);

                    setViewing(true);



                    break;
                case 'export':
                    console.log('Export task:', task);
                    setExportTask({ projectId: task.projectId, taskId: task.id });
                    setActiveDialog('export');
                    break;
                case 'restart':
                    await fetchJSON(`${API_PROJECTS}/${task.projectId}/tasks/${task.id}/restart/`, {
                        method: 'POST'
                    });
                    break;
                default:
                    console.warn('Unknown action type:', actionType);
            }
            // Refresh tasks after action
            loadRunningTasksStructure();
        } catch (error) {
            console.error('Task action failed:', error);
        }
    }, [fetchJSON, loadRunningTasksStructure]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects, activeView]);

    useEffect(() => {
        if (activeView === "tasks") {
            loadRunningTasksStructure();
        }
    }, [activeView, loadRunningTasksStructure]);

    useEffect(() => {
        let interval;
        if (activeView === "tasks" && runningTasks.length > 0) {
            interval = setInterval(updateRunningTasksProgress, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeView, runningTasks, updateRunningTasksProgress]);


    const onAddProject=()=>{
        setActiveDialog("create-project");


    }
    const onAddTask=(projectId)=>{

        setActiveProjectId(projectId);
        setActiveDialog("edit-task");
    }
    const DialogueManager = () => {
        useEffect(() => {
            const addCloseButtons = () => {
                const dialogues = document.querySelectorAll('.dialog:not(.no-close)');

                dialogues.forEach(dialogue => {
                    // Check if close button already exists
                    if (!dialogue.querySelector('.dialog-close')) {
                        const closeButton = document.createElement('button');
                        closeButton.className = 'dialog-close';

                        closeButton.innerHTML =   '<svg width="20" height="20" viewBox="0 0 24 24" ><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'


                        closeButton.addEventListener('click', () => {
                           setActiveDialog("none")
                        });

                        // Make dialogue position relative

                        dialogue.appendChild(closeButton);
                    }
                });
            };

            addCloseButtons();
        }, []);

        return null; // This component doesn't render anything
    };

    const handleViewChange = (view, projectId = null) => {
        setActiveView(view);
        setFilterProjectId(projectId);
    };

    const refreshTasks = async () => {
        await loadRunningTasksStructure();
        await fetchProjects();
    };

    return (
        <div className="main-menu">
            <DialogueManager />
            <div className="sidebar-menu">
                <Sidebar changeView={handleViewChange} setIsLogged={props.setIsLogged} activeView={activeView} setShowLogoutDialog={setShowLogoutDialog} />
            </div>
            <div className="main-view">
                {activeView === "dash" && <h1>Dashboard</h1>}
                {activeView === "gcp" && <GcpInterface/>}
                {activeView === "proj" && (
                    <Projects
                        projects={projects}
                        loading={loading}
                        onAddProject={onAddProject}
                        onAddTask={onAddTask}
                        onEditProject={(id, updatedProject) => {
                            setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updatedProject } : p));
                        }}
                        fetchProjects={fetchProjects}
                        changeView={handleViewChange}
                        refreshTasks={refreshTasks} // Pass refreshTasks to Projects
                    />
                )}
                {activeView === "tasks" && (
                    <Tasks
                        runningTasks={filterProjectId ? runningTasks.filter(task => task.projectId === filterProjectId) : runningTasks}
                        loading={loading}
                        onRefresh={loadRunningTasksStructure}
                        onTaskAction={handleTaskAction}
                        isViewing={isViewing}
                        exitView={() => { setViewing(false); }}
                        selectedTask={selectedTask}
                        filterProjectId={filterProjectId}
                        setFilterProjectId={setFilterProjectId}
                        projects={projects}
                    />
                )}
                {
                    activeDialog === "edit-task" && (
                        <div className="modal-overlay">
                            <div className="dialog">
                                <CreateNewTask
                                    exit={() => { setActiveDialog("none"); setActiveProjectId(null); }}
                                    redirect={setActiveView}
                                    projectId={activeProjectId}
                                    onTaskCreated={refreshTasks} // Pass refreshTasks to CreateNewTask
                                />
                            </div>
                        </div>
                    )
                }
                {
                    activeDialog === "create-project" && (
                        <div className="modal-overlay"  >
                            <div className="dialog">
                                <NewProject
                                    onAddProject={async () => {
                                        await fetchProjects();
                                    }}
                                    exit={() => { setActiveDialog("none") }}
                                />
                            </div>
                        </div>
                    )
                }
                {activeView === "admin" && <Admin changeView={handleViewChange} />}
            </div>
            {activeDialog === "export" && (
                <div className="modal-overlay">
                    <div className="dialog">
                        <Export
                            projectId={exportTask.projectId}
                            taskId={exportTask.taskId}
                            onClose={() => setActiveDialog("none")} // Pass onClose prop
                        />
                    </div>
                </div>
            )}
            {showLogoutDialog && (
                <div className="modal-overlay">
                    <div className="dialog no-close">
                        <p>Are you sure you want to logout?</p>
                        <div className="logout-dialog-actions">
                            <button onClick={async () => {
                                try {
                                    const res = await authorizedFetch('/logout/', {
                                        method: 'POST',
                                        headers: { 'Accept': 'application/json' },
                                    });
                                    let data = null;
                                    try { data = await res.json(); } catch (_) {}
                                    if (!data?.ok) {
                                        console.error('Logout response invalid', data);
                                    }
                                } catch (error) {
                                    console.error('Logout failed', error);
                                } finally {
                                    sessionStorage.removeItem('username');
                                    props.setIsLogged(false);
                                }
                            }} className="logout-dialog-btn">Yes</button>
                            <button onClick={() => setShowLogoutDialog(false)} className="logout-dialog-btn no">No</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}