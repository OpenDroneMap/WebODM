import React, { useEffect, useState } from 'react';
import './sidebar.css'
import ProfileInfo from './ProfileInfo.jsx'
import { useNavigate } from 'react-router-dom';
import { getCookie } from "../utils/cookieUtils";
import { authorizedFetch } from '../utils/api';

// Import icons
import dashboardSelected from '../assets/dashboard_sidebar_selected.png';
import dashboardUnselected from '../assets/dashboard_sidebar_unselected.png';
import projectsSelected from '../assets/projects_sidebar_selected.png';
import projectsUnselected from '../assets/projects_sidebar_unselected.png';
import tasksSelected from '../assets/tasks_sidebar_selected.png';
import tasksUnselected from '../assets/tasks_sidebar_unselected.png';
import gcpSelected from '../assets/GCP_sidebar_selected.png';
import gcpUnselected from '../assets/GCP_sidebar_unselected.png';
import adminSelected from '../assets/admin_sidebar_selected.png';
import adminUnselected from '../assets/admin_sidebar_unselected.png';
import logoutIcon from '../assets/logout_sidebar.png';

function Sidebar({ changeView, activeView, setShowLogoutDialog }) {
    const [isSuperuser, setIsSuperuser] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // First try to get from sessionStorage (existing functionality)
        const sessionSuperuser = sessionStorage.getItem('is_superuser') === 'true';
        setIsSuperuser(sessionSuperuser);

        // Then fetch user details for more accurate info
        const fetchUserDetails = async () => {
            try {
                const response = await authorizedFetch('/api/admin/users/'); 
                const data = await response.json();
                if (data && data.results && data.results.length > 0) {
                    const currentUser = data.results.find(user => user.username === sessionStorage.getItem('username'));
                    setIsSuperuser(currentUser?.is_superuser || sessionSuperuser);
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
                // Fall back to sessionStorage value if fetch fails
                setIsSuperuser(sessionSuperuser);
            }
        };

        fetchUserDetails();
    }, []);

    const doDashboard = () => changeView("dash");
    const doProjects = () => changeView("proj");
    const doTasks = () => changeView("tasks");
    const doGcp = () => changeView("gcp");
    const doAdmin = () => changeView("admin");

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return(
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <button className="hamburger-btn" onClick={toggleSidebar}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
            <div className='profile'>
                <ProfileInfo isCollapsed={isCollapsed}/>
            </div>
            <div className="sidebar-content" >
                <button className={activeView === "dash" ? "isfocused" : "notfocused"} onClick={doDashboard}>
                    <img src={activeView === "dash" ? dashboardSelected : dashboardUnselected} alt="Dashboard" />
                    {!isCollapsed && <span>Dashboard</span>}
                </button>
                <button className={activeView === "proj" ? "isfocused" : "notfocused"} onClick={doProjects}>
                    <img src={activeView === "proj" ? projectsSelected : projectsUnselected} alt="Projects" />
                    {!isCollapsed && <span>Projects</span>}
                </button>
                <button className={activeView === "tasks" ? "isfocused" : "notfocused"} onClick={doTasks}>
                    <img src={activeView === "tasks" ? tasksSelected : tasksUnselected} alt="Tasks" />
                    {!isCollapsed && <span>Tasks</span>}
                </button>
                <button className={activeView === "gcp" ? "isfocused" : "notfocused"} onClick={doGcp}>
                    <img src={activeView === "gcp" ? gcpSelected : gcpUnselected} alt="GCP" />
                    {!isCollapsed && <span>GCP</span>}
                </button>
                {isSuperuser && (
                    <button className={activeView === "admin" ? "isfocused" : "notfocused"} onClick={doAdmin}>
                        <img src={activeView === "admin" ? adminSelected : adminUnselected} alt="Administration" />
                        {!isCollapsed && <span>Administration</span>}
                    </button>
                )}
            </div>
            <button onClick={() => setShowLogoutDialog(true)} className="sidebar-logout">
                <img src={logoutIcon} alt="Logout" />
            </button>
            <div className="sidebar-empty-space"></div>
        </div>

    );
}
export default Sidebar;