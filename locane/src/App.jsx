import './App.css'


import Sidebar from './components/Sidebar.jsx';
import ProfileInfo from './components/ProfileInfo.jsx';

import GcpInterface from './components/GcpInterface.jsx';

import Login from './components/Login.jsx';

import MainMenu from './components/MainMenu.jsx';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {useState} from "react";

function App() {
    const [isLogged, setIsLogged] = useState(() => {
      const csrfTokenExists = document.cookie.includes("csrftoken");
      const usernameExists = sessionStorage.getItem("username") !== null;
      return csrfTokenExists && usernameExists;
    });
      return (
        <Router>
            <Routes>


                {isLogged? <Route path="/" element={<MainMenu setIsLogged={setIsLogged} />} />:<Route path="/" element={<Login isLogged={isLogged} setIsLogged={setIsLogged} />} />}




            </Routes>
        </Router>
    );




}

export default App