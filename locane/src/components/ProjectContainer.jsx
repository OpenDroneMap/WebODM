import './projectviewer.css'
import ResultMap from "./ResultMap.jsx";
import Switcher11 from "./Switcher11.jsx";
import PotreeMap from "./PotreeMap.jsx";
import {useState} from "react";
const ProjectViewer = ({project_details,exit}) => {
    const projectName = project_details.projectName;
    const projectId = project_details.taskName


    const [isChecked, setIsChecked] = useState(false);
    return (
        <div className="container">
            {/* ## Header Section ## */}
            <header className="header">
                <div className="header-left">
                    <span className="back-arrow" onClick={exit}>&lt;</span>
                    <div>
                        <h1 className="project-name">{projectName}</h1>
                        <p className="project-id">{projectId}</p>
                    </div>
                </div>

                    <Switcher11 isChecked={isChecked} setIsChecked={setIsChecked} />


            </header>

            {/* ## Main Content Area ## */}
            <main className="viewer-box">

                {(!isChecked)&&(<ResultMap task_details={project_details}  />)}
                {(isChecked) && (<PotreeMap task_details={project_details}/> )}
            </main>


        </div>
    );

};
export default ProjectViewer;