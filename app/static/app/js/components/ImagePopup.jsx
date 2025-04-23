import React from 'react';
import PropTypes from 'prop-types';
import AssetDownloads from '../classes/AssetDownloads';
import '../css/ImagePopup.scss';
import { _ } from '../classes/gettext';

class ImagePopup extends React.Component {
    static propTypes = {
        feature: PropTypes.object.isRequired,
        task: PropTypes.object.isRequired,
    };

    constructor(props){
        super(props);

        this.state = {
            error: "",
            loading: true,
            expandThumb: false,

            translateX: 0,
            translateY: 0,
            scale: 1,
            dragging: false
        }
    }

    getImageUrl(){
        const { feature, task } = this.props;
        return `/api/projects/${task.project}/tasks/${task.id}/images/thumbnail/${feature.properties.filename}`;
    }

    getThumbUrl(size){
        return `${this.getImageUrl()}?size=${size}`;
    }

    componentDidMount(){
        if (this.image){
            this.image.addEventListener("fullscreenchange", this.onFullscreenChange);
            this.image.addEventListener("wheel", this.onMouseWheel);
            this.image.addEventListener("mousedown", this.onMouseDown);
            this.image.addEventListener("mousemove", this.onMouseMove);
            this.image.addEventListener("mouseup", this.onMouseUp);
            this.image.addEventListener("touchstart", this.onTouchStart);
            this.image.addEventListener("touchmove", this.onTouchMove);
            this.image.addEventListener("touchend", this.onTouchEnd);
            
        }
    }

    componentWillUnmount(){
        if (this.image){
            this.image.removeEventListener("fullscreenchange", this.onFullscreenChange);
            this.image.removeEventListener("wheel", this.onMouseWheel);
            this.image.removeEventListener("mousedown", this.onMouseDown);
            this.image.removeEventListener("mousemove", this.onMouseMove);
            this.image.removeEventListener("mouseup", this.onMouseUp);
            this.image.removeEventListener("touchstart", this.onTouchStart);
            this.image.removeEventListener("touchmove", this.onTouchMove);
            this.image.removeEventListener("touchend", this.onTouchEnd);
        }
    }

    onFullscreenChange = (e) => {
        if (!document.fullscreenElement){
            this.setState({expandThumb: false});
        }
    }

    imageOnError = () => {
        this.setState({error: _("Image missing"), loading: false});
    }

    imageOnLoad = () => {
        this.setState({loading: false});
    }

    onMouseDown = (e) => {
        const { translateX, translateY } = this.state;
        this.dragging = true;
        this.dragged = false;
        this.startMouseX = e.clientX;
        this.startTranslateX = translateX;
        this.startMouseY = e.clientY;
        this.startTranslateY = translateY;
    }

    onMouseUp = () => {
        if (this.dragging){
            this.startMouseX = this.startMouseY = 0;
            this.setState({dragging: false});
        }
        this.dragging = false;
    }

    onMouseMove = (e) => {
        if (this.dragging){
            const dx = e.clientX - this.startMouseX;
            const dy = e.clientY - this.startMouseY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5){
                this.dragged = true;
                this.setState({
                    dragging: true,
                    translateX: dx + this.startTranslateX,
                    translateY: dy + this.startTranslateY
                });
            }
        }
    }

    touchDistance = e => {
        if (e.touches && e.touches.length === 2){
            const [t1, t2] = e.touches;
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            return Math.sqrt(dx * dx + dy * dy); 
        }

        return 0;
    }

    onTouchStart = e => {
        if (e.touches.length === 2){
            this.lastTouchDist = this.touchDistance(e);
        }else if (e.touches.length === 1){
            this.lastTouchDist = 0;
            this.onMouseDown({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        }
    }

    onTouchMove = e => {
        if (e.touches.length === 2 && this.lastTouchDist > 0){
            const [t1, t2] = e.touches;
            const curDist = this.touchDistance(e);
            const delta = 1.5 * (curDist - this.lastTouchDist);
            if (Math.abs(delta) > 0.05){
                this.lastTouchDist = curDist;
                this.onMouseWheel({
                    clientX: (t1.clientX + t2.clientX) / 2,
                    clientY: (t1.clientY + t2.clientY) / 2,
                    deltaY: -delta
                });
            }
        }else if (e.touches.length === 1){
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
        if (!this.image || !this.state.expandThumb) return;

        let { translateX, translateY, scale } = this.state;

        const maxScale = 60;

        const rect = this.image.querySelector("img").getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const delta = -e.deltaY || e.wheelDelta || -e.detail;
        const zoomFactor = 1.0 + (2.0 * delta / Math.max(window.innerHeight, window.innerWidth));
        const newScale = Math.max(1, scale * zoomFactor);
        
        if (newScale > maxScale) return;

        const imgX = (mouseX - rect.left) / scale;
        const imgY = (mouseY - rect.top) / scale;

        translateX -= imgX * (newScale - scale);
        translateY -= imgY * (newScale - scale);
        scale = newScale;

        if (scale == 1){
            translateX = 0;
            translateY = 0;
        }

        this.setState({ translateX, translateY, scale });
    }
    

    onImgClick = () => {
        const { expandThumb } = this.state;

        if (!expandThumb){
            this.image.requestFullscreen();
            this.setState({ loading: true, expandThumb: true, translateX: 0, translateY: 0, scale: 1});
        }else if (!this.dragged){
            document.exitFullscreen();
            this.setState({ expandThumb: false, translateX: 0, translateY: 0, scale: 1 });
        }
    }

    render(){
        const { error, loading, expandThumb, dragging, translateX, translateY, scale } = this.state;
        const { feature, task } = this.props;

        const downloadImageLink = `/api/projects/${task.project}/tasks/${task.id}/images/download/${feature.properties.filename}`;
        const downloadShotsLink =  `/api/projects/${task.project}/tasks/${task.id}/download/shots.geojson`;
        const imageUrl = expandThumb ? this.getThumbUrl(999999999) : this.getThumbUrl(320);
        const assetDownload = AssetDownloads.only(["shots.geojson"])[0];

        return (<div className="image-popup">
            <div className="title" title={feature.properties.filename}>{feature.properties.filename}</div>
            {loading ? <div><i className="fa fa-circle-notch fa-spin fa-fw"></i></div>
            : ""}
            {error !== "" ? <div style={{marginTop: "8px"}}>{error}</div>
            : [
                <div key="image" className={`image ${expandThumb ? "fullscreen" : ""} ${dragging ? "dragging" : ""}`} 
                                style={{marginTop: "8px"}}  
                                ref={(domNode) => { this.image = domNode;}}>
                    {loading && expandThumb ? <div><i className="fa fa-circle-notch fa-spin fa-fw"></i></div> : ""}
                    <a draggable="false" onClick={this.onImgClick} href="javascript:void(0);" title={feature.properties.filename}><img draggable="false" style={{borderRadius: "4px", transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`}} src={imageUrl} onLoad={this.imageOnLoad} onError={this.imageOnError} /></a>
                </div>,
                <div key="download-image">
                    <a href={downloadImageLink}><i className="fa fa-image"></i> {_("Download Image")}</a>
                </div>
            ]}
            <div>
                <a href={downloadShotsLink}><i className={assetDownload.icon}></i> {assetDownload.label} </a>
            </div>
        </div>);
    }
}

export default ImagePopup;
