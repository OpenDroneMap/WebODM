import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './Export.css';
import { authorizedFetch } from '../utils/api.js';

function Export({ projectId, taskId, onClose, openExportTaskId, setOpenExportTaskId }) {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogAsset, setDialogAsset] = useState(null);
    
    // State for the dialog options
    const [projection, setProjection] = useState('EPSG:32643');
    const [format, setFormat] = useState(''); // Initial format is empty
    const [customProjection, setCustomProjection] = useState('');
    const [resample, setResample] = useState('');

    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
	const [downloadProgress, setDownloadProgress] = useState(null);
	const [hasContentLength, setHasContentLength] = useState(null);

    useEffect(() => {
        authorizedFetch(`/api/projects/${projectId}/tasks/${taskId}/`)
            .then(res => res.json())
            .then(data => {
                const available = data.available_assets || [];
                setAssets(available);
                setLoading(false);
            });
    }, [projectId, taskId]);

    useEffect(() => {
        if (dialogAsset) {
            if (dialogAsset === "georeferenced_model.laz") {
                setFormat('laz');
            } else {
                setFormat('GeoTIFF (Raw)');
            }
            setProjection('EPSG:32643');
            setCustomProjection('');
            setResample('');
        }
    }, [dialogAsset]);

	const formatApiMap = {
		"GeoTIFF (Raw)": "gtiff",
		"GeoTIFF (RGB)": "gtiff-rgb",
		"JPEG (RGB)": "jpg",
		"PNG (RGB)": "png",
		"KMZ (RGB)": "kmz",
		"laz": "laz",
		"las": "las",
		"ply": "ply",
		"csv": "csv",
	};

	const downloadAsset = async (url, filename) => {
		try {
			setDownloadProgress(0);
			const response = await authorizedFetch(url);
			const contentLengthHeader = response.headers.get('content-length');
			const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
			setHasContentLength(!!totalBytes);

			if (!response.body || typeof response.body.getReader !== 'function') {
				const blob = await response.blob();
				const link = document.createElement('a');
				link.href = window.URL.createObjectURL(blob);
				link.download = filename;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				setDownloadProgress(100);
				return;
			}

			const reader = response.body.getReader();
			const chunks = [];
			let receivedBytes = 0;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
				receivedBytes += value.byteLength;
				if (totalBytes) {
					const percent = Math.max(0, Math.min(100, Math.round((receivedBytes / totalBytes) * 100)));
					setDownloadProgress(percent);
				}
			}

			const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
			const link = document.createElement('a');
			link.href = window.URL.createObjectURL(blob);
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setDownloadProgress(100);
		} catch (e) {
			console.error('Download error:', e);
			setExportStatus(`Error during download: ${e.message}`);
			throw e;
		}
	};

    const fileMappings = {
        "all.zip": "All Assets",
        "orthophoto.tif": "Orthophoto",
        "orthophoto.mbtiles": "Orthophoto (MBTiles)",
        "orthophoto_tiles.zip": "Orthophoto (Tiles)",
        "cutline.gpkg": "Orthophoto Cutline",
        "dtm.tif": "Terrain Model",
        "dtm_tiles.zip": "Terrain Model (Tiles)",
        "dsm.tif": "Surface Model",
        "dsm_tiles.zip": "Surface Model (Tiles)",
        "georeferenced_model.laz": "Point Cloud",
        "textured_model.zip": "Textured Model",
        "textured_model.glb": "Textured Model (GLB)",
        "3d_tiles_model.zip": "3D Tiles (Model)",
        "3d_tiles_pointcloud.zip": "3D Tiles (Point Cloud)",
        "cameras.json": "Cameras",
        "shots.geojson": "Shots",
        "report.pdf": "Report",
        "ground_control_points.geojson": "Ground Control Points"
    };

    const handleDownload = (asset) => {
        if (["orthophoto.tif", "dtm.tif", "dsm.tif", "georeferenced_model.laz"].includes(asset)) {
            setDialogAsset(asset);
            return;
        }
        const url = `/api/projects/${projectId}/tasks/${taskId}/download/${asset}`;
        downloadAsset(url, asset);
    };

    const handleDialogSubmit = async () => {
        const isDefaultPointCloud =
            dialogAsset === "georeferenced_model.laz" &&
            projection === "EPSG:32643" &&
            format === "laz" &&
            customProjection === "" &&
            resample === "";

        const isDefaultOtherAssets =
            ["orthophoto.tif", "dtm.tif", "dsm.tif"].includes(dialogAsset) &&
            projection === "EPSG:32643" &&
            format === "GeoTIFF (Raw)" &&
            customProjection === "";

		if (isDefaultPointCloud || isDefaultOtherAssets) {
			const url = `/api/projects/${projectId}/tasks/${taskId}/download/${dialogAsset}`;
			try {
				setIsExporting(true);
				setExportStatus('Preparing download...');
				await downloadAsset(url, dialogAsset);
			} finally {
				setIsExporting(false);
				setDialogAsset(null);
				setDownloadProgress(null);
			}
        } else {
            // --- NON-DEFAULT EXPORT LOGIC STARTS HERE ---
            setIsExporting(true);
            setExportStatus('Initiating export...');

            const assetName = dialogAsset.split('.')[0];
            const exportUrl = `/api/projects/${projectId}/tasks/${taskId}/${assetName}/export`;

            const formData = new FormData();
            formData.append('format', formatApiMap[format] || format);
            
            const epsgValue = projection === 'custom' 
                ? customProjection 
                : projection.split(':')[1];
            formData.append('epsg', epsgValue);

            if (resample) {
                formData.append('resample', resample);
            }

            try {
                const startResponse = await authorizedFetch(exportUrl, {
                    method: 'POST',
                    body: formData,
                });

                if (!startResponse.ok) {
                    throw new Error(`Failed to start export: ${startResponse.statusText}`);
                }

                const result = await startResponse.json();
                const { celery_task_id, filename } = result;
                pollTaskStatus(celery_task_id, filename);

            } catch (error) {
                console.error("Export error:", error);
                setExportStatus(`Error: ${error.message}`);
                setIsExporting(false);
            }
        }
    };

    const pollTaskStatus = (celeryTaskId, filename) => {
        const intervalId = setInterval(async () => {
            try {
                const checkUrl = `/api/workers/check/${celeryTaskId}`;
                const statusResponse = await authorizedFetch(checkUrl);

                if (!statusResponse.ok) {
                    throw new Error('Could not check task status.');
                }

                const statusResult = await statusResponse.json();

				if (statusResult.ready) {
                    clearInterval(intervalId);
                    setExportStatus('Download starting...');
                    const downloadUrl = `/api/workers/get/${celeryTaskId}?filename=${filename}`;
					try {
						await downloadAsset(downloadUrl, filename);
					} finally {
						setIsExporting(false);
						setDialogAsset(null);
						setDownloadProgress(null);
						setHasContentLength(null);
					}
                } else {
                    const progress = statusResult.progress ? `(${Math.round(statusResult.progress)}%)` : '';
                    setExportStatus(`${statusResult.status || 'Processing...'} ${progress}`);
                }
            } catch (error) {
                clearInterval(intervalId);
                console.error("Polling error:", error);
                setExportStatus(`Error checking status: ${error.message}`);
                setIsExporting(false);
            }
        }, 2000);
    };

	const dialogContent = dialogAsset && (
		<div className="modal-overlay" onClick={(e) => {
			// Block overlay clicks from reaching underlying UI
			e.stopPropagation();
		}}>
			<div className="dialog" onClick={(e) => e.stopPropagation()}>
                <h3>Configure Export for {fileMappings[dialogAsset]}</h3>
                <fieldset disabled={isExporting}>
                    <div className="dialog-content">
                        <label>
                            Projection:
                            <select value={projection} onChange={(e) => setProjection(e.target.value)}>
                                <option value="EPSG:32643">UTM (EPSG:32643)</option>
                                <option value="EPSG:4326">Lat/Lon (EPSG:4326)</option>
                                <option value="EPSG:3857">Web Mercator (EPSG:3857)</option>
                                <option value="custom">Custom EPSG</option>
                            </select>
                        </label>

                        {projection === "custom" && (
                            <label>
                                EPSG:
                                <input
                                    type="number"
                                    value={customProjection || 4326}
                                    onChange={(e) => setCustomProjection(e.target.value)}
                                />
                            </label>
                        )}

                        <label>
                            Format:
                            <select value={format} onChange={(e) => setFormat(e.target.value)}>
                                {dialogAsset === "georeferenced_model.laz" ? (
                                    <>
                                        <option value="laz">LAZ</option>
                                        <option value="las">LAS</option>
                                        <option value="ply">PLY</option>
                                        <option value="csv">CSV</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="GeoTIFF (Raw)">GeoTIFF (Raw)</option>
                                        <option value="GeoTIFF (RGB)">GeoTIFF (RGB)</option>
                                        <option value="JPEG (RGB)">JPEG (RGB)</option>
                                        <option value="PNG (RGB)">PNG (RGB)</option>
                                        <option value="KMZ (RGB)">KMZ (RGB)</option>
                                    </>
                                )}
                            </select>
                        </label>

                        {dialogAsset === "georeferenced_model.laz" && (
                            <label>
                                Resample (meters):
                                <input
                                    type="number"
                                    value={resample}
                                    onChange={(e) => setResample(e.target.value)}
                                />
                            </label>
                        )}
                    </div>
                </fieldset>

				{/* Loading UI shown only in overlay */}

                <div className="dialog-actions">
                    <button onClick={handleDialogSubmit} className="submit-btn" disabled={isExporting}>
                        {isExporting ? 'Exporting...' : 'Submit'}
                    </button>
                    <button onClick={() => setDialogAsset(null)} className="cancel-btn" disabled={isExporting}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

	const isDropdownVisible = openExportTaskId === taskId;

	const toggleDropdown = () => {
		if (isDropdownVisible) {
			setOpenExportTaskId(null);
		} else {
			setOpenExportTaskId(taskId);
		}
	};

	return (
        <div className="export-container">
			<button
				onClick={toggleDropdown}
				type="button"
			>
                Export
            </button>
            {isDropdownVisible && (
                <ul className="export-dropdown">
                    {loading ? (
                        <li>Loading assets...</li>
                    ) : (
                        assets.map(asset => (
                            <li key={asset} onClick={() => handleDownload(asset)}>
                                {fileMappings[asset] || asset}
                            </li>
                        ))
                    )}
                </ul>
            )}

			{dialogAsset && ReactDOM.createPortal(dialogContent, document.body)}

			{isExporting && ReactDOM.createPortal(
				<div className="loading-overlay">
					<div className="loading-box">
						<div className="spinner" />
						<div className="loading-text">{exportStatus || 'Processing export...'}</div>
					{downloadProgress !== null && (
						<div className="download-progress overlay">
							{hasContentLength ? (
								<>
									<progress value={downloadProgress || 0} max="100"></progress>
									<span>{downloadProgress}%</span>
								</>
							) : (
								<div className="indeterminate-bar">
									<div className="indeterminate-fill"></div>
								</div>
							)}
						</div>
					)}
					</div>
				</div>,
				document.body
			)}
        </div>
    );
}

export default Export;