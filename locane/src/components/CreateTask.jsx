import Upload from "./Upload.jsx";
import React, { useEffect, useState } from "react";
import exifr from "exifr";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { authorizedFetch } from '../utils/api.js';
import './createtask.css';
import axios from 'axios'
import {getCookie} from "../utils/cookieUtils.js";
import './Tasks.css'

function Map_Prev({ images }) {
    const [positions, setPositions] = useState([]);

    const MapRecenter = ({ positions }) => {
        const map = useMap();
        useEffect(() => {
            if (!positions || positions.length === 0) return;
            map.fitBounds(positions, { padding: [50, 50] });
        }, [positions, map]);
        return null;
    };

    useEffect(() => {
        const extractPositions = async () => {
            const coords = [];
            for (const file of images) {
                try {
                    const { latitude, longitude } = await exifr.gps(file) || {};
                    if (latitude && longitude) {
                        coords.push([latitude, longitude]);
                    }
                } catch (error) {
                    console.error("Error reading EXIF GPS data:", error);
                }
            }
            setPositions(coords);
        };
        extractPositions();
    }, [images]);

    return (
        <div>
            <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={true} style={{ height: "400px", width: "100%", marginTop: "20px" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter positions={positions} />
                {positions.map((pos, idx) => (
                    <Marker key={idx} position={pos}>
                        <Popup>Image #{idx + 1}<br />Lat: {pos[0].toFixed(4)}, Lng: {pos[1].toFixed(4)}</Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

function Task({ images, defaultTaskName, onSubmit,isDisabled }) {
    const [options, setOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [resizeOption, setResizeOption] = useState(-1);
    const [taskName, setTaskName] = useState("");

    useEffect(() => {
        const fetchPresets = async () => {
            const reqOptions = {
                method: 'GET',
            };
            try {
                const response = await authorizedFetch(`/api/presets/?ordering=-system,-created_at`, reqOptions);
                if (!response.ok) {
                    throw new Error(`Failed to fetch presets. Status: ${response.status}`);
                }
                const data = await response.json();
                const filtered = data.filter(item => item.name && item.name.trim() !== "");
                setOptions(filtered);
                const defaultOpt = filtered.find(opt => opt.id === 10) || filtered[0];
                if (defaultOpt) {
                    setSelectedOption(defaultOpt);
                }
            } catch (error) {
                console.error("Error fetching presets:", error);
            }
        };
        fetchPresets();
    }, []);

    const handleOptionChange = (e) => {
        const selectedId = parseInt(e.target.value);
        const selectedObj = options.find((opt) => opt.id === selectedId);
        setSelectedOption(selectedObj);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("name", taskName.trim() !== "" ? taskName.trim() : defaultTaskName);
        formData.append("resize_to", parseInt(resizeOption));
        if (selectedOption) {
            formData.append("options", JSON.stringify(selectedOption.options));
        }
        formData.append('processing_node', 2);


        onSubmit(formData);
    };

    return (
        <div className={`createtaskbox ${isDisabled ? 'disabled' : ''}`}>
            <div className="taskbox">
                <input
                    type="text"
                    name="name"
                    className="TaskName"
                    placeholder={defaultTaskName}
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    // Add the disabled attribute
                    disabled={isDisabled}
                />
                <form className="Task-form" onSubmit={handleSubmit}>
                    <div className="options-resize-container">
                        <div className="options">
                            <div>
                                <label htmlFor="options-select">Options</label>
                                <select
                                    id="options-select"
                                    onChange={handleOptionChange}
                                    value={selectedOption ? selectedOption.id : ''}
                                    disabled={options.length === 0 || isDisabled}
                                >
                                    {options.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="resize">
                            <label htmlFor="resize-select">Resize</label>
                            <select
                                id="resize-select"
                                value={resizeOption}
                                onChange={(e) => setResizeOption(e.target.value)}
                                // Add the disabled attribute
                                disabled={isDisabled}
                            >
                                <option value="-1">None</option>
                                {[512, 1024, 2048, 4096].map((width) => (
                                    <option key={width} value={width}>
                                        {width} px
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div className="mapcontainer">
                <Map_Prev images={images} />
            </div>
        </div>
    );
}


export default function CreateNewTask({ exit, redirect, projectId, onTaskCreated }) {

    const [imageFiles, setImageFiles] = useState([]);
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [progress,setProgress]=useState(0.0);

    const nextStep = () => {
        if (step === 1) {
            if (imageFiles.length < 2) {
                const msg = "At least two images are required to proceed.";
                setError(msg);
                alert(msg);
                return;
            }
            setError(null);
        }
        setStep(s => (s < 2 ? s + 1 : s));
    };

    const prevStep = () => setStep(s => (s > 1 ? s - 1 : s));

    const getDefaultTaskName = () => {
        const now = new Date();
        return `Task ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    };

    async function createTask(formData) {

        formData.append("partial",true)
        formData.append("align","auto")
        console.log(formData);


        try {

            const response= await axios.post(`/api/projects/${projectId}/tasks/`, formData, {

                headers: { 'X-CSRFToken': getCookie("csrftoken")},
                withCredentials: true,



            });
            console.log("Response:", response.data);
            const id=response.data.id
            setSuccess("Task created successfully!");
            if (onTaskCreated) {
                onTaskCreated(); // Notify parent component about task creation
            }
            await uploadImages(imageFiles,id);
            await commitImages(id);
            exit()
        } catch (err) {
            // err.response has backend info if available
            if (err.response) {
                setError(`Failed: ${err.response.status} - ${err.response.data?.detail || err.message}`);
            } else {
                setError(err.message);
            }
        }



    }

    async function uploadImages(imageFiles,taskId) {
        const ratio=100/imageFiles.length;

        const upload=`/api/projects/${projectId}/tasks/${taskId}/upload/`;
        const uploadPromises = imageFiles.map(item => {
            const fd = new FormData();
            fd.append("images", item.file);

            // Return the promise from axios.post
            return axios.post(upload, fd, {
                headers: { 'X-CSRFToken': getCookie("csrftoken") ,'X-Requested-With': XMLHttpRequest},
                method: "POST",
                withCredentials: true,

                onUploadProgress: (progress)=>{if(progress.progress===1){

                    setProgress(prev=>prev+ratio);

                }},
            });
        });

        try {
            // Wait for ALL promises in the array to resolve
            const responses = await Promise.all(uploadPromises);

            console.log("All files uploaded successfully! ✅");
            setSuccess("Uploading Complete");
            responses.forEach(response => {
                console.log(response.data);
            });

        } catch (error) {
            console.error("An error occurred during one of the uploads: ❌", error);
        }

    }

    async function commitImages(taskId) {

        const commit=`/api/projects/${projectId}/tasks/${taskId}/commit/`;

        try {

            const response= await axios.post(commit, null, {
                headers: { 'X-CSRFToken': getCookie("csrftoken") },
                method: "POST",
                withCredentials: true,

            });

            console.log("Response:", response.data);
            exit()





        } catch (error) {
            console.error("An error occurred:", error);
        }

    }

    const startTask = async (formData) => {
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        createTask(formData);



    }

    const handleImageDelete = (indexToDelete) => {
        URL.revokeObjectURL(imageFiles[indexToDelete].preview);

        const updatedImageFiles = imageFiles.filter((_, i) => i !== indexToDelete);
        setImageFiles(updatedImageFiles);

        if (updatedImageFiles.length < 2) {
            setError("At least two images are required to proceed.");
        } else {
            setError(null);
        }
    };

    const imagesForMap = imageFiles.map(item => item.file);

    return (
        <div className="task-card">
            {step > 1 && <button onClick={prevStep} disabled={isSubmitting} className="task-btn">Back</button>}
            {step < 2 && <button onClick={nextStep} className="task-btn">Next</button>}

            {step === 1 && (
                <Upload 

                    imageFiles={imageFiles}
                    setImageFiles={setImageFiles}
                    onDelete={handleImageDelete} 
                />
            )}
            
            {step === 2 && (
                <div>
                    <Task
                        images={imagesForMap}
                        defaultTaskName={getDefaultTaskName()}
                        onSubmit={startTask}
                        isDisabled={isSubmitting}
                    />
                    {isSubmitting ? (<div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${progress}%`,
                                transition: "width 0.5s ease",
                            }}
                        />
                    </div>):( <button
                        type="submit"
                        onClick={(e) => {
                            e.preventDefault();
                            document.querySelector('.Task-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                        }}
                        disabled={isSubmitting}
                        className="task-btn"
                    >Start Task

                    </button>)}



                    {error && <div style={{ color: 'red', marginTop: '10px' }}>Error: {error}</div>}
                    {success && <div style={{ color: 'green', marginTop: '10px' }}>{success}</div>}
                </div>
            )}
        </div>
    );
}