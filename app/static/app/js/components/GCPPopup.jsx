import React from 'react';
import PropTypes from 'prop-types';
import AssetDownloads from '../classes/AssetDownloads';
import '../css/GCPPopup.scss';
import { _ } from '../classes/gettext';

class GCPPopup extends React.Component {
    static propTypes = {
        feature: PropTypes.object.isRequired,
        task: PropTypes.object.isRequired,
    };

    constructor(props){
        super(props);

        this.state = {
            error: "",
            loading: true,
            expandGCPImage: false,
            selectedShot: "",
            zoom: 4
        }
    }

    selectShot = (shotId) => {
        if (shotId !== this.state.selectedShot){
            this.setState({loading: true, selectedShot: shotId, error: ""});
        }
    }

    _getCoords = (shotId, key) => {
        if (!shotId) return [0.5, 0.5];

        const { feature } = this.props;
        const ob = feature.properties.observations.find(o => o.shot_id === shotId);

        if (ob){
            return ob[key];
        }else{
            return [0.5, 0.5];
        }
    }

    getAnnotationCoords = (shotId) => {
        return this._getCoords(shotId, 'annotated');
    }

    getReprojectedCoords = (shotId) => {
        return this._getCoords(shotId, 'reprojected');
    }

    getThumbUrl = (size) => {
        const { task } = this.props;
        const { selectedShot, zoom } = this.state;
        const annotated = this.getAnnotationCoords(selectedShot);
        const reprojected = this.getReprojectedCoords(selectedShot);
    
        return `/api/projects/${task.project}/tasks/${task.id}/images/thumbnail/${selectedShot}?size=${size}&center_x=${annotated[0]}&center_y=${annotated[1]}&draw_point=${annotated[0]},${annotated[1]}&point_color=f29900&point_radius=2&draw_point=${reprojected[0]},${reprojected[1]}&&point_color=00ff00&point_radius=2&zoom=${zoom}`;
    }

    componentDidMount(){
        const { feature } = this.props;

        document.addEventListener("fullscreenchange", this.onFullscreenChange);
        if (feature.properties.observations) this.selectShot(feature.properties.observations[0].shot_id);
        if (this.imageContainer) this.imageContainer.addEventListener("mousewheel", this.onImageWheel); // onWheel doesn't work :/
    }

    componentWillUnmount(){
        document.removeEventListener("fullscreenchange", this.onFullscreenChange);
        if (this.imageContainer) this.imageContainer.removeEventListener("mousewheel", this.onImageWheel);
    }

    onFullscreenChange = (e) => {
        if (!document.fullscreenElement){
            this.setState({expandGCPImage: false});
        }
    }

    imageOnError = () => {
        this.setState({error: _("Image missing"), loading: false});
    }

    imageOnLoad = () => {
        this.setState({loading: false});
    }

    canZoomIn = () => {
        return this.state.zoom < 10 && !this.state.loading;
    }

    canZoomOut = () => {
        return this.state.zoom > 1 && !this.state.loading;
    }

    zoomIn = () => {
        if (this.canZoomIn()){
            this.setState({loading: true, zoom: this.state.zoom + 1});
        }
    }

    zoomOut = () => {
        if (this.canZoomOut()){
            this.setState({loading: true, zoom: this.state.zoom - 1});
        }
    }

    onImageWheel = e => {
        if (e.deltaY > 0){
            this.zoomIn();
        }else{
            this.zoomOut();
        }
    }

    onImgClick = () => {
        const { expandGCPImage } = this.state;

        if (!expandGCPImage){
            this.image.requestFullscreen();
            this.setState({ loading: true, expandGCPImage: true});
        }else{
            document.exitFullscreen();
            this.setState({ loading: true, expandGCPImage: false });
        }
    }

    render(){
        const { error, loading, expandGCPImage, selectedShot } = this.state;
        const { feature, task } = this.props;
        
        const downloadGCPLink =  `/api/projects/${task.project}/tasks/${task.id}/download/ground_control_points.geojson`;
        const assetDownload = AssetDownloads.only(["ground_control_points.geojson"])[0];
        const imageUrl = expandGCPImage ? this.getThumbUrl(999999999) : this.getThumbUrl(320);

        const shotLinks = [];
        for (let i = 0; i < feature.properties.observations.length; i++){
            const obs = feature.properties.observations[i];
            if (obs.shot_id === selectedShot){
                shotLinks.push(<span key={obs.shot_id}>{obs.shot_id}</span>);
            }else{
                shotLinks.push(<a key={obs.shot_id} className="gcp-image-link" href="javascript:void(0)" onClick={() => this.selectShot(obs.shot_id)}>{obs.shot_id}</a>);
            }
            if (i+1 < feature.properties.observations.length) shotLinks.push(<span key={"divider-" + i}> | </span>);
        }

        const imgStyle = {
            borderRadius: "4px",
            minHeight: "32px"
        };

        return (<div className="gcp-popup">
            <div className="title" title={feature.properties.id}>{feature.properties.id}</div>
            <div>
                {shotLinks}
            </div>

            <div className="image-container" ref={(domNode) => this.imageContainer = domNode }>
                {loading ? <div className="spinner"><i className="fa fa-circle-notch fa-spin fa-fw"></i></div> : ""}
                {error ? <div style={{marginTop: "8px"}}>{error}</div> : ""}
                
                {!error && selectedShot !== "" ? 
                <div className={`image ${expandGCPImage ? "fullscreen" : ""} ${loading ? "loading" : ""}`} style={{marginTop: "8px"}}  ref={(domNode) => { this.image = domNode;}}>
                    {loading && expandGCPImage ? <div><i className="fa fa-circle-notch fa-spin fa-fw"></i></div> : ""}
                    <a onClick={this.onImgClick} href="javascript:void(0);" title={selectedShot}><img style={imgStyle} src={imageUrl} onLoad={this.imageOnLoad} onError={this.imageOnError} /></a>
                </div> : ""}
            </div>

            <div className="btn-group zoom-buttons">
                <button onClick={this.zoomOut} disabled={!this.canZoomOut()} type="button" className="btn btn-xs btn-default" title="-">-</button>
                <button onClick={this.zoomIn} disabled={!this.canZoomIn()} type="button" className="btn btn-xs btn-default" title="+">+</button>
            </div>

            <div>
                <strong>{_("Horizontal error:")}</strong> {Math.abs(Math.max(feature.properties.error[0], feature.properties.error[1])).toFixed(3)} {_("(meters)")}
            </div>
            <div>
                <strong>{_("Vertical error:")}</strong> {Math.abs(feature.properties.error[2]).toFixed(3)} {_("(meters)")}
            </div>
            <div>
                <a href={downloadGCPLink}><i className={assetDownload.icon}></i> {assetDownload.label} </a>
            </div>
        </div>);
    }
}

export default GCPPopup;
