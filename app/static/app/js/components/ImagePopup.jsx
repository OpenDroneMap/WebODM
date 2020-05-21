import React from 'react';
import PropTypes from 'prop-types';
import AssetDownloads from '../classes/AssetDownloads';
import '../css/ImagePopup.scss';

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
        this.image.addEventListener("fullscreenchange", this.onFullscreenChange);
    }

    componentWillUnmount(){
        this.image.removeEventListener("fullscreenchange", this.onFullscreenChange);
    }

    onFullscreenChange = (e) => {
        if (!document.fullscreenElement){
            this.setState({expandThumb: false});
        }
    }

    imageOnError = () => {
        this.setState({error: "Image is missing", loading: false});
    }

    imageOnLoad = () => {
        this.setState({loading: false});
    }

    onImgClick = () => {
        const { expandThumb } = this.state;

        if (!expandThumb){
            this.image.requestFullscreen();
            this.setState({ loading: true, expandThumb: true});
        }else{
            document.exitFullscreen();
            this.setState({ expandThumb: false });
        }
    }

    render(){
        const { error, loading, expandThumb } = this.state;
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
                <div key="image" className={`image ${expandThumb ? "fullscreen" : ""}`} style={{marginTop: "8px"}}  ref={(domNode) => { this.image = domNode;}}>
                    {loading && expandThumb ? <div><i className="fa fa-circle-notch fa-spin fa-fw"></i></div> : ""}
                    <a onClick={this.onImgClick} href="javascript:void(0);" title={feature.properties.filename}><img style={{borderRadius: "4px"}} src={imageUrl} onLoad={this.imageOnLoad} onError={this.imageOnError} /></a>
                </div>,
                <div key="download-image">
                    <a href={downloadImageLink}><i className="fa fa-image"></i> Download Image</a>
                </div>
            ]}
            <div>
                <a href={downloadShotsLink}><i className={assetDownload.icon}></i> {assetDownload.label} </a>
            </div>
        </div>);
    }
}

export default ImagePopup;