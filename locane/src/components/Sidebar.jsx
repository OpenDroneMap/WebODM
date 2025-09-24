import React, { useEffect, useState } from 'react';
import './sidebar.css'
import ProfileInfo from './ProfileInfo.jsx'
import { useNavigate } from 'react-router-dom';
import { getCookie } from "../utils/cookieUtils";
import { authorizedFetch } from '../utils/api';

function Sidebar({ changeView, activeView, setShowLogoutDialog }) {
    const [isSuperuser, setIsSuperuser] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const response = await authorizedFetch('/api/admin/users/'); 
                const data = await response.json();
                if (data && data.results && data.results.length > 0) {
                    const currentUser = data.results.find(user => user.username === sessionStorage.getItem('username'));
                    setIsSuperuser(currentUser?.is_superuser || false);
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
            }
        };

        fetchUserDetails();
    }, []);

    const doDashboard = () => changeView("dash");
    const doProjects = () => changeView("proj");
    const doTasks = () => changeView("tasks");
    const doGcp = () => changeView("gcp");
    const doAdmin = () => changeView("admin");

    return(
        <div className="sidebar">
            <div className='profile'>
                <ProfileInfo/>
            </div>
            <div className="sidebar-content" >
                <button className={activeView === "dash" ? "isfocused" : "notfocused"} onClick={doDashboard}>Dashboard</button>
                <button className={activeView === "proj" ? "isfocused" : "notfocused"} onClick={doProjects}>Projects</button>
                <button className={activeView === "tasks" ? "isfocused" : "notfocused"} onClick={doTasks}>Tasks</button>
                <button className={activeView === "gcp" ? "isfocused" : "notfocused"} onClick={doGcp}>GCP</button>
                {isSuperuser && (
                    <button className={activeView === "admin" ? "isfocused" : "notfocused"} onClick={doAdmin}>Administration</button>
                )}
            </div>
            <button onClick={() => setShowLogoutDialog(true)} className="sidebar-logout"> Logout </button>
        </div>

    )

}
export default Sidebar