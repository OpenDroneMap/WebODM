import React from 'react';
import PropTypes from 'prop-types';
import '../css/MediaView.scss';
import { _ } from '../classes/gettext';
import Utils from '../classes/Utils';

class MediaView extends React.Component {
    static propTypes = {
        basePath: PropTypes.string.isRequired,
        media: PropTypes.object.isRequired,
        autoOpen: PropTypes.bool,
        onClose: PropTypes.func,
        halfScreen: PropTypes.bool,
        mapContainer: PropTypes.object,
        onVideoElement: PropTypes.func
    };

    constructor(props) {
        super(props);

        this.ref = React.createRef();

        this.state = {
            error: "",
            visible: false,
            loading: true
        }

        this.translateX = 0;
        this.translateY = 0;
        this.scale = 1;
    }

    getImageUrl() {
        return `${this.props.basePath}/download/${encodeURIComponent(this.props.media.filename)}`;
    }

    getThumbUrl() {
        return `${this.props.basePath}/thumbnail/${encodeURIComponent(this.props.media.filename)}?size=256`;
    }

    componentDidMount() {
        this.observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    this.setState({ visible: true });
                    this.observer.disconnect();
                }
            }
        );
        if (this.ref.current) this.observer.observe(this.ref.current);

        if (this.props.autoOpen) this.onImgClick();
    }

    componentWillUnmount() {
        if (this.observer) this.observer.disconnect();

        if (this.panoViewer) {
            this.panoViewer.destroy();
            this.panoViewer = null;
        }

        this.closePhotoViewer();
        this.closeVideoViewer();
    }

    imageOnError = () => {
        this.setState({ error: _("Image missing"), loading: false });
    }

    imageOnLoad = () => {
        this.setState({ loading: false });
    }

    onMouseDown = (e) => {
        this.dragging = true;
        this.dragged = false;
        this.startMouseX = e.clientX;
        this.startTranslateX = this.translateX;
        this.startMouseY = e.clientY;
        this.startTranslateY = this.translateY;
    }

    onMouseUp = () => {
        if (this.dragging && this.photoOverlay) {
            this.photoOverlay.classList.remove('dragging');
        }
        this.dragging = false;
    }

    onMouseMove = (e) => {
        if (this.dragging) {
            const dx = e.clientX - this.startMouseX;
            const dy = e.clientY - this.startMouseY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                this.dragged = true;
                this.translateX = dx + this.startTranslateX;
                this.translateY = dy + this.startTranslateY;
                if (this.photoOverlay) this.photoOverlay.classList.add('dragging');
                this.applyFsTransform();
            }
        }
    }

    touchDistance = e => {
        if (e.touches && e.touches.length === 2) {
            const [t1, t2] = e.touches;
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        return 0;
    }

    onTouchStart = e => {
        if (e.touches.length === 2) {
            this.lastTouchDist = this.touchDistance(e);
        } else if (e.touches.length === 1) {
            this.lastTouchDist = 0;
            this.onMouseDown({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        }
    }

    onTouchMove = e => {
        if (e.touches.length === 2 && this.lastTouchDist > 0) {
            const [t1, t2] = e.touches;
            const curDist = this.touchDistance(e);
            const delta = 1.5 * (curDist - this.lastTouchDist);
            if (Math.abs(delta) > 0.05) {
                this.lastTouchDist = curDist;
                this.onMouseWheel({
                    clientX: (t1.clientX + t2.clientX) / 2,
                    clientY: (t1.clientY + t2.clientY) / 2,
                    deltaY: -delta
                });
            }
        } else if (e.touches.length === 1) {
            this.onMouseMove({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        }
    }

    onTouchEnd = () => {
        this.lastTouchDist = 0;
        this.onMouseUp();
    }

    onMouseWheel = e => {
        if (!this.fsImage) return;

        const maxScale = 60;
        const rect = this.fsImage.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const delta = -e.deltaY || e.wheelDelta || -e.detail;
        const zoomFactor = 1.0 + (2.0 * delta / Math.max(window.innerHeight, window.innerWidth));
        const newScale = Math.max(1, this.scale * zoomFactor);

        if (newScale > maxScale) return;

        const imgX = (mouseX - rect.left) / this.scale;
        const imgY = (mouseY - rect.top) / this.scale;

        this.translateX -= imgX * (newScale - this.scale);
        this.translateY -= imgY * (newScale - this.scale);
        this.scale = newScale;

        if (this.scale == 1) {
            this.translateX = 0;
            this.translateY = 0;
        }

        this.applyFsTransform();
    }


    loadPannellum = () => {
        return Utils.dynamicLoad([
            '/static/app/js/vendor/pannellum/pannellum.css',
            '/static/app/js/vendor/pannellum/pannellum.js'], 'pannellum');
    }

    getVideoUrl() {
        return `${this.props.basePath}/download/${encodeURIComponent(this.props.media.filename)}`;
    }

    closeVideoViewer = () => {
        if (this.videoOverlay) {
            this.videoOverlay.remove();
            this.videoOverlay = null;
        }
        if (this.videoEscHandler) {
            document.removeEventListener('keydown', this.videoEscHandler, true);
            this.videoEscHandler = null;
        }
        if (this.props.onClose) this.props.onClose();
    }

    openVideoViewer = () => {
        const halfScreen = this.props.halfScreen && this.props.mapContainer;

        const overlay = document.createElement('div');
        overlay.className = halfScreen ? 'video-overlay video-half-screen' : 'video-overlay';
        this.videoOverlay = overlay;

        this.videoEscHandler = (e) => {
            if (e.key === 'Escape') {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.closeVideoViewer();
            }
        };
        document.addEventListener('keydown', this.videoEscHandler, true);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'video-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.closeVideoViewer();
        overlay.appendChild(closeBtn);

        const video = document.createElement('video');
        video.className = 'video-player';
        video.src = this.getVideoUrl();
        video.controls = true;
        video.autoplay = true;
        overlay.appendChild(video);

        if (this.props.onVideoElement) {
            this.props.onVideoElement(video);
        }

        if (this.props.media.description) {
            const desc = document.createElement('div');
            desc.className = 'media-description';
            desc.textContent = this.props.media.description;
            overlay.appendChild(desc);
        }

        if (halfScreen) {
            this.props.mapContainer.appendChild(overlay);
        } else {
            document.body.appendChild(overlay);
        }
    }

    buildPanoConfig() {
        const { media, basePath } = this.props;
        const TILE_SIZE = 2048;
        const imgW = media.width || 4096;
        const cubeSize = 8 * Math.floor(imgW / Math.PI / 8);
        const tileSize = Math.min(TILE_SIZE, cubeSize);
        let levels = Math.ceil(Math.log(cubeSize / tileSize) / Math.log(2)) + 1;
        if (levels >= 2 && Math.floor(cubeSize / Math.pow(2, levels - 2)) === tileSize) {
            levels -= 1;
        }
        const tilePath = `${basePath}/panorama/${encodeURIComponent(media.filename)}/tiles/%l/%s/%y/%x`;
        return {
            autoLoad: true,
            type: "multires",
            multiRes: {
                path: tilePath,
                extension: "jpg",
                tileResolution: tileSize,
                maxLevel: levels,
                cubeResolution: cubeSize,
            },
            showControls: false,
            autoRotate: -1,
            title: Utils.escapeHtml(media.description) || ""
        };
    }

    openPanoViewer = () => {
        this.loadPannellum().then(() => {
            const overlay = document.createElement('div');
            overlay.className = 'pano-overlay';

            const closePano = () => {
                if (this.panoViewer) {
                    this.panoViewer.destroy();
                    this.panoViewer = null;
                }
                document.removeEventListener('keydown', escHandler, true);
                overlay.remove();
                if (this.props.onClose) this.props.onClose();
            };

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    closePano();
                }
            };
            document.addEventListener('keydown', escHandler, true);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'pano-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = closePano;
            overlay.appendChild(closeBtn);

            const container = document.createElement('div');
            container.className = 'pano-container';
            overlay.appendChild(container);

            document.body.appendChild(overlay);

            this.panoViewer = window.pannellum.viewer(container, this.buildPanoConfig());
        });
    }

    applyFsTransform = () => {
        if (this.fsImage) {
            this.fsImage.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        }
    }

    openPhotoViewer = () => {
        const overlay = document.createElement('div');
        overlay.className = 'media-view-image fullscreen';
        this.photoOverlay = overlay;

        this.translateX = 0;
        this.translateY = 0;
        this.scale = 1;

        const spinner = document.createElement('div');
        spinner.innerHTML = '<i class="fa fa-circle-notch fa-spin fa-fw"></i>';
        overlay.appendChild(spinner);

        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        thumb.draggable = false;
        thumb.onclick = () => {
            if (!this.dragged) this.closePhotoViewer();
        };
        overlay.appendChild(thumb);

        const img = document.createElement('img');
        img.draggable = false;
        img.style.visibility = 'hidden';
        img.style.borderRadius = '4px';
        img.src = this.getImageUrl();
        img.alt = this.props.media.filename;
        img.title = this.props.media.filename;
        this.fsImage = img;

        img.onload = () => {
            spinner.remove();
            img.style.visibility = 'visible';
        };

        thumb.appendChild(img);

        if (this.props.media.description) {
            const desc = document.createElement('div');
            desc.className = 'media-description';
            desc.textContent = this.props.media.description;
            overlay.appendChild(desc);
        }

        this.photoEscHandler = (e) => {
            if (e.key === 'Escape') {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.closePhotoViewer();
            }
        };
        document.addEventListener('keydown', this.photoEscHandler, true);

        overlay.addEventListener('wheel', this.onMouseWheel);
        overlay.addEventListener('mousedown', this.onMouseDown);
        overlay.addEventListener('mousemove', this.onMouseMove);
        overlay.addEventListener('mouseup', this.onMouseUp);
        overlay.addEventListener('touchstart', this.onTouchStart);
        overlay.addEventListener('touchmove', this.onTouchMove);
        overlay.addEventListener('touchend', this.onTouchEnd);

        document.body.appendChild(overlay);
    }

    closePhotoViewer = () => {
        if (this.photoOverlay) {
            this.photoOverlay.remove();
            this.photoOverlay = null;
        }
        this.fsImage = null;
        if (this.photoEscHandler) {
            document.removeEventListener('keydown', this.photoEscHandler, true);
            this.photoEscHandler = null;
        }
        if (this.props.onClose) this.props.onClose();
    }

    onImgClick = () => {
        if (this.props.media.type === 'pano') {
            this.openPanoViewer();
            return;
        }
        if (this.props.media.type === 'video') {
            this.openVideoViewer();
            return;
        }
        this.openPhotoViewer();
    }

    render() {
        if (this.props.autoOpen) return null;

        const { error, visible, loading } = this.state;
        const isVideo = this.props.media.type === 'video';

        return (<div className={"media-view " + (!loading ? " theme-secondary-complementary" : "")} ref={this.ref}>
            {(loading || !visible) ? <div><i className="fa fa-circle-notch fa-spin fa-fw media-loading"></i></div>
                : ""}
            {error !== "" ? <div style={{ marginTop: "8px" }}>{error}</div>
                : visible ? <div className="media-thumb-container">
                    <div className="media-view-image">
                        {isVideo && !loading ? <div className="video-play-overlay"><i className="fa fa-play"></i></div> : ""}
                        <div className="media-thumb" draggable="false" onClick={this.onImgClick}>
                            <img draggable="false" style={{ visibility: loading ? "hidden" : "visible", borderRadius: "4px" }} src={this.getThumbUrl()} onLoad={this.imageOnLoad} onError={this.imageOnError} alt={this.props.media.filename} title={this.props.media.filename} />
                        </div>
                    </div>
                </div> : ""}
        </div>);
    }
}

export default MediaView;
