import React from 'react';
import './CostEstimateItem.scss';
import ResizeModes from 'webodm/classes/ResizeModes';
import PropTypes from 'prop-types';
import $ from 'jquery';
import { _ } from 'webodm/classes/gettext';

export default class CostEstimateItem extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    taskInfo: PropTypes.object.isRequired,
    getFiles: PropTypes.func.isRequired,
    filesCount: PropTypes.number.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        loading: false,
        show: false,
        credits: ""
    }

    this.imageWidth = null;
    this.imageHeight = null;
  }

  componentDidUpdate(prevProps){
    if (prevProps.taskInfo.selectedNode &&
        this.props.taskInfo.selectedNode && 
        prevProps.taskInfo.selectedNode.key !== this.props.taskInfo.selectedNode.key){
        if (this.props.taskInfo.selectedNode.key !== "auto"){
            $.get(`/plugins/lightning/is_lightning_node?id=${this.props.taskInfo.selectedNode.key}`)
             .done(json => {
                if (json.result !== undefined){
                    this.setState({show: json.result});
                    if (json.result) this.estimateCredits();
                }
             });
        }
    }

    if (this.state.show){
        if (prevProps.taskInfo.resizeMode !== this.props.taskInfo.resizeMode ||
            prevProps.taskInfo.resizeSize !== this.props.taskInfo.resizeSize){
            this.estimateCredits();
        }
    }
  }

  extractImageDimensions = (file, cb) => {
    const reader = new FileReader();
    reader.onload = (entry => {
        var image = new Image(); 
        image.src = entry.target.result;
        image.onload = function() {
            cb({
                width: this.width,
                height: this.height
            })
        };
    });

    reader.readAsDataURL(file);
  }

  estimateCredits = () => {
    this.setState({loading: true});

    const getEstimate = () => {
        const { taskInfo } = this.props;

        let width = this.imageWidth;
        let height = this.imageHeight;
    
        if (taskInfo.resizeMode === ResizeModes.YES ||
            taskInfo.resizeMode === ResizeModes.YESINBROWSER){
            let largestSide = Math.max(width, height);
            let multiplier = taskInfo.resizeSize / largestSide;
    
            width = Math.ceil(width * multiplier);
            height = Math.ceil(height * multiplier);
            if (width <= 0) width = 1;
            if (height <= 0) height = 1;
        }

        if (this.estimateRequest){
            this.estimateRequest.abort();
            this.estimateRequest = null;
        }

        this.estimateRequest = $.get("https://webodm.net/r/tasks/estimateCost", {
            images: this.props.filesCount,
            width,
            height
        }).done(json => {
            if (json.credits_estimate !== undefined){
                if (json.credits_estimate === 0) json.credits_estimate += " (Free)";
                this.setState({credits: json.credits_estimate})
            }else{
                this.setState({credits: _("Cannot retrieve estimate. Try again later.")});
            }
        }).fail(e => {
            this.setState({credits: _("Cannot retrieve estimate. Check parameters or try again later.")});
        }).always(() => {
            this.setState({loading: false});
            this.estimateRequest = null;
        });
    };

    if (this.props.filesCount > 0){
        if (this.imageWidth === null && this.imageHeight === null){
            const files = this.props.getFiles();
            const imageFile = Array.prototype.find.call(files, f => f.type.startsWith("image/"));
            if (imageFile){
                this.extractImageDimensions(imageFile, dims => {
                    this.imageWidth = dims.width;
                    this.imageHeight = dims.height;
                    getEstimate();
                });
            }else{
                this.setState({show: false});
            }
        }else{
            getEstimate();
        }
    }else{
        this.setState({show: false});
    }
  }

  render(){
    const { show, loading, credits } = this.state;

    return (
        <div className={"lightning-cost-estimate-item " + (show ? "" : "hide")}>
            <label className="col-sm-2 control-label">{_("Credits Estimate")}</label>
            <div className="col-sm-10 num-credits">
                {loading ?
                 <i className="fa fa-circle-notch fa-spin"></i> :
                 <div>
                     { credits }
                 </div>}
            </div>
        </div>
    );
  }
}