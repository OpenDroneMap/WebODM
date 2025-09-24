import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import exifr from 'exifr';
import proj4 from 'proj4';
import './GcpInterface.css';
import ImageViewer from "./ImageViewer";
import { useNavigate } from "react-router-dom";
import Login from './Login';

const MapBoundsUpdater = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds);
        }
    }, [bounds, map]);
    return null;
};

const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click: () => {
            onMapClick();
        },
    });
    return null;
};

function distance2D(lat1, lon1, lat2, lon2) {
    const dLat = (lat1 || 0) - (lat2 || 0);
    const dLon = (lon1 || 0) - (lon2 || 0);
    return Math.sqrt(dLat * dLat + dLon * dLon);
}

function GcpInterface() {
    const [gcpPoints, setGcpPoints] = useState([]);
    const [images, setImages] = useState([]);
    const [showDirections, setShowDirections] = useState(false);
    const [selectedGcpPoint, setSelectedGcpPoint] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [gcpLinks, setGcpLinks] = useState([]);
    const [pendingPoint, setPendingPoint] = useState(null);
    const [loggedOut, setLoggedOut] = useState(false);
    const gcpInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const navigate = useNavigate();

    const handleRemoveImage = (e, imageUrlToRemove) => {
        e.stopPropagation();
        setImages(currentImages => currentImages.filter(img => img.url !== imageUrlToRemove));
        setGcpLinks(currentLinks => currentLinks.filter(link => link.image.url !== imageUrlToRemove));
    };

    const handleGcpFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                const points = lines.slice(1).map((line, index) => {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 3) {
                        return {
                            id: parts[0] || `Point ${index + 1}`,
                            lat: parseFloat(parts[2]),
                            lon: parseFloat(parts[1]),
                            alt: parts[3] ? parseFloat(parts[3]) : null,
                        };
                    }
                    return null;
                }).filter(p => p && !isNaN(p.lat) && !isNaN(p.lon));
                setGcpPoints(points);
            };
            reader.readAsText(file);
        }
    };

    const handleImageChange = async (event) => {
        const files = Array.from(event.target.files);
    
        const imagePromises = files.map(async (file) => {
            try {
                const { latitude, longitude, GPSAltitude } = await exifr.parse(file);
                return {
                    url: URL.createObjectURL(file),
                    name: file.name,
                    lat: latitude,
                    lon: longitude,
                    alt: GPSAltitude,
                };
            } catch (error) {
                console.error("Could not read EXIF data for file:", file.name);
                return {
                    url: URL.createObjectURL(file),
                    name: file.name,
                    lat: null,
                    lon: null,
                    alt: null,
                };
            }
        });
    
        const newImages = await Promise.all(imagePromises);
        setImages(currentImages => [...currentImages, ...newImages]);
    };

    const handleImagePointSelect = (coords) => {
        setPendingPoint({
            image: selectedImage,
            imageCoords: coords
        });
    };

    const handleImagePointDelete = () => {
        setPendingPoint(null);
    };
    
    const handleGcpMarkerClick = (gcpPoint) => {
        if (pendingPoint && pendingPoint.imageCoords) {
            const newLink = {
                id: `${pendingPoint.image.name}-${gcpPoint.id}-${Date.now()}`,
                gcp: gcpPoint,
                image: pendingPoint.image,
                imageCoords: pendingPoint.imageCoords,
            };
            setGcpLinks(prevLinks => [...prevLinks, newLink]);
            setPendingPoint(null);
            setSelectedImage(null);
            setSelectedIndex(null);
        } else {
            setSelectedGcpPoint(gcpPoint);
        }
    };
    
    const handleExport = () => {
        if (gcpLinks.length === 0) return;

        const sampleLon = gcpLinks[0].gcp.lon;
        const utmZone = Math.floor((sampleLon + 180) / 6) + 1;

        const sourceCRS = 'EPSG:4326';
        const destCRS = `+proj=utm +zone=${utmZone} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
        const header = destCRS;
        const dataLines = gcpLinks.map(link => {
            const lon = link.gcp.lon;
            const lat = link.gcp.lat;
            const [easting, northing] = proj4(sourceCRS, destCRS, [lon, lat]);
            const alt = link.gcp.alt ?? 0;
            const u = link.imageCoords.x.toFixed(2);
            const v = link.imageCoords.y.toFixed(2);
            const imgName = link.image.name;
            const gcpId = link.gcp.id;

            return `${easting.toFixed(2)}\t${northing.toFixed(2)}\t${alt}\t${u}\t${v}\t${imgName}\t${gcpId}`;
        }).join('\n');
        const fileContent = `${header}\n${dataLines}`;

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'gcp_export.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    

    const closeImageViewer = () => {
        setSelectedImage(null);
        setSelectedIndex(null);
        setPendingPoint(null);
    };

    const mapBounds = gcpPoints.length > 0 ? gcpPoints.map(p => [p.lat, p.lon]) : [];

    const imageLinkCounts = gcpLinks.reduce((acc, link) => {
        const imageUrl = link.image.url;
        acc[imageUrl] = (acc[imageUrl] || 0) + 1;
        return acc;
    }, {});

    const latestLinkTimestamps = gcpLinks.reduce((acc, link) => {
        const imageUrl = link.image.url;
        const timestamp = parseInt(link.id.split('-').pop(), 10);
        if (!acc[imageUrl] || timestamp > acc[imageUrl]) {
            acc[imageUrl] = timestamp;
        }
        return acc;
    }, {});

    let displayedImages = images;
    if (selectedGcpPoint) {
        displayedImages = [...images]
            .filter(img => img.lat !== null && img.lon !== null)
            .map(img => ({
                ...img,
                dist: distance2D(selectedGcpPoint.lat, selectedGcpPoint.lon, img.lat, img.lon)
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 12);
    } else {
        displayedImages = [...images].sort((a, b) => {
            const timeA = latestLinkTimestamps[a.url] || 0;
            const timeB = latestLinkTimestamps[b.url] || 0;
            if (timeA !== timeB) {
                return timeB - timeA;
            }
            return images.indexOf(b) - images.indexOf(a);
        });
    }

    const handleMapClick = () => {
        setSelectedGcpPoint(null);
    };

    if (loggedOut) {
        return <Login />;
    }

    return (
        <div className="gcp-window">
            <div className="top-bar">
                <div className="top-bar-left">
                    <div className="title">
                        Ground Control Point Interface
                    </div>
                </div>
                <div className="top-bar-right">
                    <button 
                        className="export-button" 
                        onClick={handleExport}
                        disabled={gcpLinks.length === 0}
                    >
                        EXPORT FILE
                    </button>
                </div>
            </div>
            <div className="main-content">
                <div className="left-panel">
                    {selectedImage ? (
                        <ImageViewer
                            image={selectedImage}
                            index={selectedIndex}
                            onClose={closeImageViewer}
                            onPointSelect={handleImagePointSelect}
                            onPointDelete={handleImagePointDelete}
                            hasPendingPoint={!!pendingPoint}
                        />
                    ) : (
                    <>
                    <div className="gcp-list-section">
                        <h4>LINKED POINTS ({gcpLinks.length})</h4>
                        {gcpLinks.length === 0 ? (
                            <p className="no-points">No links created yet...</p>
                        ) : (
                            <ul className="linked-points-list">
                                {gcpLinks.map((link) => (
                                    <li key={link.id}>
                                        <span> {link.image.name} ↔️  {link.gcp.id}</span>
                                        <button 
                                            className="delete-link-btn" 
                                            onClick={() => setGcpLinks(links => links.filter(l => l.id !== link.id))}
                                        >
                                            ✖
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="gcp-list-section">
                        <h4>GROUND CONTROL POINTS</h4>
                        {gcpPoints.length === 0 ? (
                            <p className="no-points">No points...</p>
                        ) : (
                            <ul>
                                {gcpPoints.map((p, i) => <li key={i}>{p.id}</li>)}
                            </ul>
                        )}
                    </div>
                    <div className="directions-section">
                        <h4 onClick={() => setShowDirections(!showDirections)} className="collapsible">
                           {showDirections ? '▼' : '►'} DIRECTIONS
                        </h4>
                        {showDirections && (
                        <>
                            <div style={{ marginBottom: "8px" }}>
                                Connect at least 5 high-contrast objects in 3 or more photos to their corresponding locations on the map.
                            </div>
                            <ol>
                                <li>Upload images (jpeg or png).</li>
                                <li>Set a point in an image.</li>
                                <li>Set a corresponding point on the map.</li>
                                <li>Repeat as desired (at least until the goal is achieved).</li>
                                <li>Generate the ground control point file.</li>
                            </ol>
                        </>
                        )}
                    </div>
                    <div className="file-controls">
                        <input
                            type="file"
                            accept=".txt"
                            ref={gcpInputRef}
                            onChange={handleGcpFileChange}
                            style={{ display: 'none' }}
                        />
                        <button onClick={() => gcpInputRef.current.click()}>
                            Load existing Control Point File
                        </button>
                        <input
                            type="file"
                            accept="image/jpeg, image/png"
                            multiple
                            ref={imageInputRef}
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                        <button onClick={() => imageInputRef.current.click()}>
                            Choose images
                        </button>
                    </div>
                    <div className="image-grid">
                        {displayedImages.map((image, i) => {
                            const linkCount = imageLinkCounts[image.url] || 0;
                            return (
                            <div key={image.url} className="thumbnail" onClick={() => {
                                setSelectedImage(image); 
                                setSelectedIndex(i);
                            }}>
                                <img src={image.url} alt={image.name} />
                                <span className="image-name">{image.name}</span>
                                <span className="link-count-badge">{linkCount}</span>
                                <button className="delete-btn" onClick={(e) => handleRemoveImage(e, image.url)}>
                                X</button>
                            </div>
                        )})}
                    </div>
                    </>
                    )}
                </div>
                <div className="right-panel">
                    <MapContainer center={[20, 0]} zoom={2} className="map-container" style={{cursor: pendingPoint ? 'crosshair' : 'auto'}}>
                        <MapClickHandler onMapClick={handleMapClick} />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {gcpPoints.map((point) => (
                            <Marker 
                                key={point.id} 
                                position={[point.lat, point.lon]} 
                                eventHandlers={{ click: () => handleGcpMarkerClick(point) }}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                                    {point.id}
                                </Tooltip>
                            </Marker>
                        ))}
                        <MapBoundsUpdater bounds={mapBounds} />
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}

export default GcpInterface;