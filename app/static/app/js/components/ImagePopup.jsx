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
            scale: 1
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
            this.image.addEventListener("mousewheel", this.onMouseWheel);
        }
    }

    componentWillUnmount(){
        if (this.image){
            this.image.removeEventListener("fullscreenchange", this.onFullscreenChange);
            this.image.removeEventListener("mousewheel", this.onMouseWheel);
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


    onMouseWheel = e => {
        if (!this.image || !this.state.expandThumb) return;

        let { translateX, translateY, scale } = this.state;

        const maxScale = 60;

        const rect = this.image.querySelector("img").getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const delta = -e.deltaY || e.wheelDelta || -e.detail;
        const zoomFactor = 1.2;
        const newScale = Math.max(1, delta > 0 ? scale * zoomFactor : scale / zoomFactor);
        
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
        }else{
            document.exitFullscreen();
            this.setState({ expandThumb: false, translateX: 0, translateY: 0, scale: 1 });
            this.image
        }
    }

    render(){
        const { error, loading, expandThumb, translateX, translateY, scale } = this.state;
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
                <div key="image" className={`image ${expandThumb ? "fullscreen" : ""}`} 
                                style={{marginTop: "8px"}}  
                                ref={(domNode) => { this.image = domNode;}}>
                    {loading && expandThumb ? <div><i className="fa fa-circle-notch fa-spin fa-fw"></i></div> : ""}
                    <a onClick={this.onImgClick} href="javascript:void(0);" title={feature.properties.filename}><img style={{borderRadius: "4px", transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`}} src={imageUrl} onLoad={this.imageOnLoad} onError={this.imageOnError} /></a>
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
