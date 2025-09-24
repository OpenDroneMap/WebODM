import "./NewProject.css"

import { useState} from "react";
import "./Projects.css"
import "./NewProject.css";
import { authorizedFetch } from "../utils/api.js";

function CreateNewProject(props) {
    return (<>
        <div className="card-header">
            <input type="text" name="name" className="projectName" placeholder="New Project" onChange={props.onChange2}/>
        </div>
        <div className="description">
            <label>Description</label>
            <textarea rows={5} cols={20} name="description" onChange={props.onChange1}></textarea>

        </div>

        <input className="submit-button"   type="submit" value="Save" onClick={props.onClick}/>
        <button className="cancel-button" onClick={props.close}>Cancel</button>
    </>);
}

function NewProject({onAddProject,exit})
{


    const [project, setProject] = useState("New");
    //const [tags, setTags] = useState(null);
    const [description, setDescription] = useState(null);

    const createProject= ()=>{
        const newProject=
            {
            name:project,
            description:description,

            }

        console.log(JSON.stringify(newProject));
        const requestOptions=
            {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body:JSON.stringify(newProject)
        }
        console.log(JSON.stringify(newProject));

        authorizedFetch("/api/projects/", requestOptions)
            .then(res=>res.json())
            .then(res=>console.log(res))


        console.log(JSON.stringify(newProject));


        setTimeout(onAddProject, 100);
        exit();




    }







    return(


            <CreateNewProject onChange2={(e) => setProject(e.target.value)}
                                              onChange1={(e) => setDescription(e.target.value)} onClick={createProject} close={exit}/>






    );


}
export default NewProject