import {GeoJSON, MapContainer, TileLayer} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../leafletConfig.js'; // Configure Leaflet icons
import {useEffect, useState, useRef} from 'react';
import "./resultmap.css"
import {ScaleLoader, SyncLoader} from "react-spinners";
import interpolate from "color-interpolate";
import {authorizedFetch} from '../utils/api.js';
import { getCookie } from "../utils/cookieUtils";
import {findMinMaxFromGeoJSON} from "../utils/geoJson.js";
import CachedTileLayer from './CachedTileLayer.jsx';



const projectionOptions = [
    { value: 'custom', label: 'Custom EPSG' },
    { value: 'wgs84', label: 'WGS 84' },
];


export default function ResultMap({task_details}) {
    const [geoGSON, setGeoGSON] = useState(null);
    const [min,setMin] = useState(0);
    const [max,setMax] = useState(1000);
    const [layerOptions,setlayerOptions]=  useState([]);
    const [dsmRescale, setDsmRescale] = useState(null);
    const [dtmRescale, setDtmRescale] = useState(null);
    console.log(task_details);
    const taskId = task_details.id;
    const projectId = task_details.projectId;
    const API_BASE = "/api";

    const orthophotoUrl = `${API_BASE}/projects/${projectId}/tasks/${taskId}/orthophoto/tiles/{z}/{x}/{y}.png`;
    const [currentLayer, setCurrentLayer] = useState('orthophoto');
    const dsmUrl = `${API_BASE}/projects/${projectId}/tasks/${taskId}/dsm/tiles/{z}/{x}/{y}.png?color_map=viridis&hillshade=6&rescale=${dsmRescale}`;
    const dtmUrl = `${API_BASE}/projects/${projectId}/tasks/${taskId}/dtm/tiles/{z}/{x}/{y}.png?color_map=viridis&hillshade=6&rescale=${dtmRescale}`;
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const mapRef = useRef();

    async function fetchLayerMetadata(tileType, setter) {
        try {
            const url = `${API_BASE}/projects/${projectId}/tasks/${taskId}/${tileType}/metadata`;
            const reqOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                credentials: 'include'
            };

            const response = await authorizedFetch(url, reqOptions);

            if (response.ok) {
                const data = await response.json();
                if (data.statistics) {
                    // Assuming single band for DSM/DTM
                    const stats = data.statistics['1'];
                    setter(`${stats.min},${stats.max}`);
                }
            }
        } catch (err) {
            console.error(`Error fetching ${tileType} metadata:`, err);
        }
    }


    useEffect(() => {
        if(geoGSON) {

        const data =findMinMaxFromGeoJSON(geoGSON,"level");
        setMin(data.min)
        setMax(data.max)

    }

    },[geoGSON])
    useEffect(() => {
        async function fetchMetadata() {
            try {
                setLoading(true);
                const url = `${API_BASE}/projects/${projectId}/tasks/${taskId}/orthophoto/tiles.json`;
                const reqOptions = {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken':getCookie('csrftoken'),

                    },
                    credentials: 'include'
                };

                const response = await authorizedFetch(url, reqOptions);

                if (response.ok) {
                    const data = await response.json();
                    console.log('Metadata fetched:', data); // Debug log
                    setMetadata(data);
                    setError(null);
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.error('Error fetching metadata:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchMetadata();
    }, []); // Fixed syntax

    useEffect(() => {
        const url =`${API_BASE}/projects/${projectId}/tasks/${taskId}/`
        fetch(url)
            .then(res => res.json())
            .then(data => {
                let assets = data.available_assets;

                if (assets.includes("dsm.tif")) {
                    fetchLayerMetadata('dsm', setDsmRescale);
                }
                if (assets.includes("dtm.tif")) {
                    fetchLayerMetadata('dtm', setDtmRescale);
                }



                setlayerOptions(prev => {
                    const newOptions = [];
                    if (assets.includes("dsm.tif") && !prev.some(opt => opt.value === "DSM")) {
                        newOptions.push({label: "DSM", value: "DSM"});
                    }
                    if (assets.includes("dtm.tif") && !prev.some(opt => opt.value === "DTM")) {
                        newOptions.push({label: "DTM", value: "DTM"});
                    }
                    return [...prev, ...newOptions];
                });
            });
    },[ taskId]);

    // Define different open-source map styles
    const mapStyles = {
        'OpenStreetMap': {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        'Esri World Imagery': {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        },
        'CartoDB Positron': {
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
    };



    const [currentMapStyle, setCurrentMapStyle] = useState('OpenStreetMap');
    const [orthoOpacity, setOrthoOpacity] = useState(1);

    const [activePanel, setActivePanel] = useState(null); // Can be 'layers', 'contours', or null

    const handleLayerChange = (layer) => {
        setCurrentLayer(layer);
    };

    const handlePanelToggle = (panelName) => {
        setActivePanel(currentPanel => (currentPanel === panelName ? null : panelName));
    };

    // Handle loading state
    if (loading) {
        return <div>Loading map metadata...</div>;
    }

    // Handle error state
    if (error) {
        return <div>Error loading metadata: {error}</div>;
    }

    // Handle case where metadata is still null
    if (!metadata) {
        return <div>No metadata available</div>;
    }
    const startColor="blue"
    const endColor="red"
    const midColor="green"
    const colorMap = interpolate([startColor,midColor, endColor]);







    // Now safely access metadata properties
    const initialBounds = metadata.bounds;
    const maxZoom = metadata.maxzoom;
    const minZoom = metadata.minzoom;
    const center = [(initialBounds[1]+initialBounds[3])/2,(initialBounds[0]+initialBounds[2])/2];
    console.log(geoGSON)
    return (
        <div className={"resultMapContainer"}>
            <div className="leaflet-top leaflet-left" style={{ zIndex: 1000, top: '120px' }}>
                <div className="terrain-toggle-buttons leaflet-control">
                    <button
                        className={`terrain-control-btn ${currentLayer === 'orthophoto' ? 'active' : ''}`}
                        onClick={() => handleLayerChange('orthophoto')}
                    >
                        Orthophoto
                    </button>
                    {layerOptions.some(opt => opt.value === 'DSM') && (
                        <button
                            className={`terrain-control-btn ${currentLayer === 'dsm' ? 'active' : ''}`}
                            onClick={() => handleLayerChange('dsm')}
                        >
                            DSM
                        </button>
                    )}
                    {layerOptions.some(opt => opt.value === 'DTM') && (
                        <button
                            className={`terrain-control-btn ${currentLayer === 'dtm' ? 'active' : ''}`}
                            onClick={() => handleLayerChange('dtm')}
                        >
                            DTM
                        </button>
                    )}
                </div>
            </div>

            <div className={"controls"}>
                <div className="map-toggle-buttons">
                    <button
                        className={`map-control-btn ${activePanel === 'layers' ? 'active' : ''}`}
                        onClick={() => handlePanelToggle('layers')}
                    >
                        Map Layers
                    </button>
                    <button
                        className={`map-control-btn ${activePanel === 'contours' ? 'active' : ''}`}
                        onClick={() => handlePanelToggle('contours')}
                    >
                        Contours
                    </button>
                </div>
                {activePanel === 'layers' && (
                    <div className={"resultMap-controls-main"}>
                        <label htmlFor="map-style-select">Select Map Style: </label>
                        <select
                            id="map-style-select"
                            onChange={(e) => setCurrentMapStyle(e.target.value)}
                            value={currentMapStyle}
                        >
                            {Object.keys(mapStyles).map(styleName => (
                                <option key={styleName} value={styleName}>
                                    {styleName}
                                </option>
                            ))}
                        </select>

                        <label htmlFor="opacity-slider">Orthophoto Opacity:</label>
                        <input
                            id="opacity-slider"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={orthoOpacity}
                            onChange={(e) => setOrthoOpacity(parseFloat(e.target.value))}
                        />
                    </div>
                )}
                {activePanel === 'contours' && (
                    <ContoursPanel
                        project={projectId}
                        task={taskId}
                        setContour={setGeoGSON}
                        geoGSON={geoGSON}
                        clearContour={() => setGeoGSON(null)}
                        layerOptions={layerOptions}
                        onClose={() => handlePanelToggle(null)}
                    />
                )}
            </div>


            <MapContainer
                center={center} // Center of bounds
                zoom={minZoom+5} // Start with minimum zoom to see full area
                maxZoom={maxZoom}
                bounds={initialBounds}
                scrollWheelZoom={true}
                style={{ height: "2000px", width: "100%", marginTop: "20px" }}
                ref={mapRef}
            >
                <TileLayer
                    attribution={mapStyles[currentMapStyle].attribution}
                    url={mapStyles[currentMapStyle].url}
                    maxZoom={maxZoom}
                />
                {currentLayer === 'orthophoto' && (
                    <CachedTileLayer
                        attribution="Orthophoto"
                        url={orthophotoUrl}
                        opacity={orthoOpacity}
                        maxZoom={maxZoom}
                        projectId={projectId}
                        taskId={taskId}
                    />
                )}
                {currentLayer === 'dsm' && (
                    <CachedTileLayer
                        attribution="DSM"
                        url={dsmUrl}
                        opacity={orthoOpacity}
                        maxZoom={maxZoom}
                        projectId={projectId}
                        taskId={taskId}
                    />
                )}
                {currentLayer === 'dtm' && (
                    <CachedTileLayer
                        attribution="DTM"
                        url={dtmUrl}
                        opacity={orthoOpacity}
                        maxZoom={maxZoom}
                        projectId={projectId}
                        taskId={taskId}
                    />
                )}
                {geoGSON && (
                    <GeoJSON
                        key={Date.now()} // Force re-render if data source changes
                        data={geoGSON}
                        style={(feature) => {
                            const level = feature.properties.level;
                            const ratio= (level-min)/(max-min);

                            return {
                                color: colorMap(ratio),      // border
                                weight: 1,

                            };}}
                        // You can add event handlers here
                        onEachFeature={(feature, layer) => {
                            // Bind a popup to each contour line showing its level
                            if (feature.properties && feature.properties.level) {
                                layer.bindPopup(`Elevation: ${feature.properties.level}m`);
                            }
                        }}
                    />
                )}
            </MapContainer>

            {geoGSON && (
                <div className="legend-wrapper">
                    <div className="legend-gradient" style={{ background: `linear-gradient(to right, ${startColor}, ${midColor}, ${endColor})` }}></div>
                    <div className="legend-labels">
                        <span>{min.toFixed(1)}m</span>
                        <span>{max.toFixed(1)}m</span>
                    </div>
                </div>
            )}
        </div>
    );
}





// --- The Contours Panel Component ---

const ContoursPanel = ({project,task,setContour,clearContour,geoGSON, layerOptions, onClose}) => {

    console.log(layerOptions);


    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);

    const exportOptions = [
        { label: "GeoJSON (.json)", value: "GeoJSON",ext: ".json" },
        { label: "AutoCAD (.dxf)", value: "DXF",ext: ".dxf" },
        { label: "GeoPackage (.gpkg)", value: "GPKG",ext: ".gpkg" },
        {label:"ShapeFile",value: "ESRI Shapefile",ext: ".zip"}
    ];
    const [selectedFormat, setSelectedFormat] = useState(exportOptions[0]);
    const [formData, setFormData] = useState({
        interval: 5,
        layer: 'DSM',
        simplify: 1.5,
        projection: 'custom',
        epsg: '4326',
        format:'GeoJSON',
        zfactor:'1'
    });

    const [worker, setWorker] = useState(null);




    useEffect(() => {



        if(worker){
            setIsLoading(true);

            polling()
        }

    },[worker])


    const polling=async () => {



                const response=await fetch(`/api/workers/check/${worker}`,{})

                const data=await response.json();
                console.log(data);
                if (data.ready===false) {
                    setTimeout(() => polling(), 2000);




                }
                else{



                    const downloadUrl=`api/plugins/contours/task/${task}/contours/download/${worker}`

                    const response = await fetch(downloadUrl,{});
                    // const response = await fetch('/data/contours.json'); // For a local file in public/data/

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    let data=null;
                    if(isExporting){
                       data= await response.blob();
                       console.log(data);

                       const url=URL.createObjectURL(data);
                       const a=document.createElement("a")
                        a.href=url;
                       a.download=`output${selectedFormat.ext}`;
                       a.click()
                        URL.revokeObjectURL(url);



                    }
                    else{
                        data=await response.json();
                        setContour(data);
                    }


                    setIsLoading(false);

                }




    }
    const onExport = async (format) => {
        const url = "/api/plugins/contours/task/"+task+"/contours/generate";





        const temp=formData;
        temp.format=format.value;
        const bodyData = new URLSearchParams(temp).toString();

        const requestOptions = {
            method: 'POST',
            headers: {
                // This header tells the server the body is URL-encoded.
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-CSRFToken':getCookie('csrftoken'),
                'Content-Disposition':'attachment; filename=[name].[ext]',


            },
            // The body must be the URL-encoded string, not a JSON string.
            body: bodyData,

            credentials: 'include',
        };

        try {
            const response = await fetch(url, requestOptions);

            // Check if the HTTP response is successful (status codes 200-299).
            if (!response.ok) {
                // If not, get more details from the response and throw an error.
                const errorData = await response.text(); // Use .text() in case the error is not JSON
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData}`);
            }

            // If the response is OK, parse it as JSON.
            const data = await response.json();
            console.log("Success:", data);
            const worker= data.celery_task_id;
            setIsExporting(true)
            setSelectedFormat(format)
            setWorker(worker)
            setIsExportOptionsOpen(false)







        } catch (error) {
            // Catch errors from the fetch call (e.g., network issues) or the error thrown above.
            console.error("There was a problem with the fetch operation:", error);
        }
    };


    async function onPreview() {
        // Construct the URL dynamically.

        const url = "/api/plugins/contours/task/"+task+"/contours/generate";




        const temp=formData
        temp.projection="4326" //only for preview
        const bodyData = new URLSearchParams(temp).toString();

        const requestOptions = {
            method: 'POST',
            headers: {
                // This header tells the server the body is URL-encoded.
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-CSRFToken':getCookie('csrftoken'),


            },
            // The body must be the URL-encoded string, not a JSON string.
            body: bodyData,

            credentials: 'include',
        };

        try {
            const response = await fetch(url, requestOptions);

            // Check if the HTTP response is successful (status codes 200-299).
            if (!response.ok) {
                // If not, get more details from the response and throw an error.
                const errorData = await response.text(); // Use .text() in case the error is not JSON
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData}`);
            }

            // If the response is OK, parse it as JSON.
            const data = await response.json();
            console.log("Success:", data);
            const worker= data.celery_task_id;
            setWorker(worker)






        } catch (error) {
            // Catch errors from the fetch call (e.g., network issues) or the error thrown above.
            console.error("There was a problem with the fetch operation:", error);
        }
    }



    const handleValueChange = (name, value) => {
        // Ensure numeric values from sliders/inputs are stored as numbers
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        setFormData(prevState => ({
            ...prevState,
            [name]: isNaN(numericValue) ? '' : numericValue,
        }));
    };

    const handleSegmentChange = (name, value) => {
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };


    return (

        <div className="contours-panel">

            {/* Header */}
            <div className="panel-header">
                <h2 className="panel-title">Contours</h2>
                <button className="close-button" onClick={onClose}>
                    <CloseIcon />
                </button>
            </div>

            {/* Form Fields */}
            <div className="form-fields">
                <FormField label="Interval (m):">
                    <SliderWithInput
                        name="interval"
                        value={formData.interval}
                        onChange={handleValueChange}
                        min={0.1}
                        max={100}
                        step={0.1}
                    />
                </FormField>

                <FormField label="Simplify:">
                    <SliderWithInput
                        name="simplify"
                        value={formData.simplify}
                        onChange={handleValueChange}
                        min={0}
                        max={10}
                        step={0.1}
                    />
                </FormField>

                {/* Conditionally render the Layer option */}
                {layerOptions.some(opt => opt.value === 'DSM' || opt.value === 'DTM') && (
                    <FormField label="Layer:">
                        <SegmentedControl
                            name="layer"
                            options={layerOptions}
                            value={formData.layer}
                            onChange={handleSegmentChange}
                        />
                    </FormField>
                )}

                <FormField label="Projection:">
                    <SegmentedControl
                        name="projection"
                        options={projectionOptions}
                        value={formData.projection}
                        onChange={handleSegmentChange}
                    />
                </FormField>

                <div className={`epsg-container ${formData.projection === 'custom' ? 'show' : ''}`}>
                    {formData.projection === 'custom' && (
                        <FormField label="EPSG:" htmlFor="epsg">
                            <Input
                                id="epsg"
                                name="epsg"
                                value={formData.epsg}
                                onChange={handleInputChange}
                            />
                        </FormField>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            {!isLoading ? (
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={onPreview}>
                        <EyeIcon />
                        Preview
                    </button>

                    <div className="dropdown">
                        <button onClick={() => setIsExportOptionsOpen(!isExportOptionsOpen)}>
                            <ExportIcon /> Export
                        </button>
                        {isExportOptionsOpen && (
                            <div className="dropdown-menu">
                                {exportOptions.map((item, index) => (
                                    <button
                                        key={index}
                                        className={"export-btn"}
                                        onClick={() => {
                                            onExport(item);
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {geoGSON && (
                        <button
                            className={`terrain-control-btn`}
                            onClick={clearContour}
                        >
                            Delete Contours
                        </button>
                    )}
                </div>
            ) : (
                <div className="action-buttons-loader-container">
                    <ScaleLoader height={10} speedMultiplier={0.9} color={"rgba(0,0,0,.25)"} />
                </div>
            )}
        </div>
    );
};


// --- Reusable Form Components ---

const FormField = ({ label, htmlFor, children }) => (
    <div className="form-field">
        <label htmlFor={htmlFor} className="form-label">
            {label}
        </label>
        <div className="form-control">
            {children}
        </div>
    </div>
);

const SliderWithInput = ({ name, value, onChange, min, max, step }) => (
    <div className="slider-with-input">
        <input
            type="range"
            className="slider"
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            min={min}
            max={max}
            step={step}
        />
        <input
            type="number"
            className="number-input"
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            min={min}
            max={max}
            step={step}
        />
    </div>
);


const SegmentedControl = ({ name, options, value, onChange }) => (
    <div className="segmented-control">
        {options.map((option) => (
            <button
                key={option.value}
                type="button"
                onClick={() => onChange(name, option.value)}
                className={`segment-button ${ value === option.value ? 'active' : '' }`}
            >
                {option.label}
            </button>
        ))}
    </div>
);


const Input = (props) => (
    <input
        type="text"
        className="text-input"
        {...props}
    />
);
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const ExportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
        <path d="M12 17V3" /><path d="m6 11 6 6 6-6" /><path d="M19 21H5" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);