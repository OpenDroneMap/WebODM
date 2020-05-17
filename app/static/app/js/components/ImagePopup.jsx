import React from 'react';
import PropTypes from 'prop-types';
import AssetDownloads from '../classes/AssetDownloads';

class ImagePopup extends React.Component {
    static propTypes = {
        feature: PropTypes.object.isRequired,
        task: PropTypes.object.isRequired,
    };

    constructor(props){
        super(props);

        this.state = {
            error: "",
        }
    }

    imageOnError = () => {
        this.setState({error: "Image is missing"});
    }

    render(){
        const { error } = this.state;
        const { feature, task } = this.props;

        const downloadImageLink = `/api/projects/${task.project}/tasks/${task.id}/images/download/${feature.properties.filename}`;
        const thumbUrl = `/api/projects/${task.project}/tasks/${task.id}/images/thumbnail/${feature.properties.filename}?size=320`;
        const downloadShotsLink =  `/api/projects/${task.project}/tasks/${task.id}/download/shots.geojson`;

        const assetDownload = AssetDownloads.only(["shots.geojson"])[0];

        return (<div>
            <strong>{feature.properties.filename}</strong>
            {error !== "" ? <div style={{marginTop: "8px"}}>{error}</div>
            : [
                <div key="image" style={{marginTop: "8px"}}>
                    <a href={downloadImageLink} title={feature.properties.filename}><img style={{borderRadius: "4px"}} src={thumbUrl} onError={this.imageOnError} /></a>
                </div>,
                <div key="download-image" style={{marginTop: "8px"}}>
                    <a href={downloadImageLink}><i className="fa fa-image"></i> Download Image</a>
                </div>
            ]}
            <div style={{marginTop: "8px"}}>
                <a href={downloadShotsLink}><i className={assetDownload.icon}></i> {assetDownload.label} </a>
            </div>
        </div>);
    }
}

export default ImagePopup;