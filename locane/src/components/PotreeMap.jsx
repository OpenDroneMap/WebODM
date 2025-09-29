import { useEffect, useRef, useState } from 'react';
import { getCookie } from '../utils/cookieUtils';
import './potreemap.css';

export default function PotreeMap({ task_details }) {
    const containerRef = useRef(null);
    const renderAreaRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const taskId = task_details.id;
    const projectId = task_details.projectId;
    const base = '/api';
    
    // Use correct base path for Potree assets
    const potreeBasePath = import.meta.env.DEV ? '/potree' : '/static/potree';

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            }).catch(err => {
                console.error('Error attempting to exit fullscreen:', err);
            });
        }
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen().then(() => {
                    setIsFullscreen(false);
                }).catch(err => {
                    console.error('Error attempting to exit fullscreen:', err);
                });
            }
        };

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        let viewer = null;
        let cancelled = false;
        let styleElVars = null;

        const loadCSS = (href) => {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`link[href="${href}"]`)) return resolve();
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = href;
                link.onload = resolve;
                link.onerror = (err) => reject(new Error(`Failed to load CSS: ${href}`));
                document.head.appendChild(link);
            });
        };

        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) return resolve();
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = (err) => reject(new Error(`Failed to load script: ${src}`));
                document.body.appendChild(script);
            });
        };

        const loadAssets = async () => {
            // JS dependencies (order is important)
            const scripts = [
                `${potreeBasePath}/libs/jquery/jquery-3.1.1.min.js`,
                `${potreeBasePath}/libs/spectrum/spectrum.js`,
                `${potreeBasePath}/libs/jquery-ui/jquery-ui.min.js`,
                `${potreeBasePath}/libs/other/BinaryHeap.js`,
                `${potreeBasePath}/libs/tween/tween.min.js`,
                `${potreeBasePath}/libs/d3/d3.js`,
                `${potreeBasePath}/libs/proj4/proj4.js`,
                `${potreeBasePath}/libs/openlayers3/ol.js`,
                `${potreeBasePath}/libs/i18next/i18next.js`,
                `${potreeBasePath}/libs/jstree/jstree.js`,
                `${potreeBasePath}/libs/copc/index.js`,
                `${potreeBasePath}/build/potree/potree.js`,
                `${potreeBasePath}/libs/plasio/js/laslaz.js`,
            ];
            // Load CSS first
            await Promise.all([
                loadCSS(`${potreeBasePath}/build/potree/potree.css`),
                loadCSS(`${potreeBasePath}/libs/jquery-ui/jquery-ui.min.css`),
                loadCSS(`${potreeBasePath}/libs/openlayers3/ol.css`),
                loadCSS(`${potreeBasePath}/libs/spectrum/spectrum.css`),
                loadCSS(`${potreeBasePath}/libs/jstree/themes/mixed/style.css`),
            ]);

            for (const src of scripts) {
                await loadScript(src);
            }
        };

        const initViewer = async () => {
            try {
                await loadAssets();
                if (cancelled) return;

                await new Promise((resolve, reject) => {
                    let waited = 0;
                    const waitInterval = 100; // ms
                    const timeout = 5000; // 5 seconds
                    const check = () => {
                        if (window.Potree) return resolve();
                        waited += waitInterval;
                        if (waited >= timeout) return reject(new Error('Timed out waiting for Potree to initialize.'));
                        setTimeout(check, waitInterval);
                    };
                    check();
                });

                const Potree = window.Potree;
                if (!Potree) throw new Error('Potree not available on window after asset load.');
                
                // *** CHANGE: Correctly configure Potree's XHR to use cookies and CSRF token ***
                if (Potree.XHRFactory && Potree.XHRFactory.createXHR) {
                    const originalCreateXHR = Potree.XHRFactory.createXHR;
                    
                    // Override the createXHR function
                    Potree.XHRFactory.createXHR = function() {
                        const xhr = originalCreateXHR();
                        xhr.withCredentials = true; 
                        return xhr;
                    };
                }

                // Set the CSRF token header for all Potree requests
                const csrfToken = getCookie("csrftoken");
                if (csrfToken && Potree.XHRFactory.config) {
                    Potree.XHRFactory.config.customHeaders = [
                        { header: 'X-CSRFToken', value: csrfToken }
                    ];
                }

                viewer = new Potree.Viewer(renderAreaRef.current);
                viewer.setEDLEnabled(true);
                viewer.setFOV(60);
                viewer.setPointBudget(2_000_000);
                viewer.loadSettingsFromURL();

                viewer.loadGUI(() => {
                    viewer.setLanguage('en');
                    if (window.$) window.$('#menu_appearance').next().show();
                });

                const eptPath = `${base}/projects/${projectId}/tasks/${taskId}/assets/entwine_pointcloud/ept.json`;
                const name = `task-${taskId}`;

                Potree.loadPointCloud(eptPath, name, function (e) {
                    if (cancelled) return;
                    viewer.scene.addPointCloud(e.pointcloud);
                    const material = e.pointcloud.material;
                    material.size = 1;
                    material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
                    viewer.fitToScreen(0.5);
                    setIsLoading(false);
                });
            } catch (err) {
                console.error('Failed to initialize Potree viewer:', err);
                setIsLoading(false);
            }
        };

        initViewer();

        return () => {
            cancelled = true;
            try {
                if (viewer && viewer.dispose) viewer.dispose();
            } catch (e) { /* ignore */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId, projectId]);

    return (
        <div ref={containerRef} className="potree-container">
            <button 
                className="fullscreen-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
            >
                {isFullscreen ? "⤓" : "⤢"}
            </button>
            {isLoading && (
                <div className="potree-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading Point Cloud Viewer...</p>
                </div>
            )}
            <div
                id="potree_render_area"
                ref={renderAreaRef}
                className="potree-viewer"
                style={{ backgroundImage: `url('${potreeBasePath}/build/potree/resources/images/background.jpg')` }}
            />
            <div id="potree_sidebar_container" />
        </div>
    );
}