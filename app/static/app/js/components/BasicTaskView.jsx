import React from 'react';
import PropTypes from 'prop-types';
import '../css/BasicTaskView.scss';
import update from 'immutability-helper';
import PipelineSteps from '../classes/PipelineSteps';
import StatusCodes from '../classes/StatusCodes';
import $ from 'jquery';

class BasicTaskView extends React.Component {
    static defaultProps = {};

    static propTypes = {
        source: PropTypes.oneOfType([
            PropTypes.string.isRequired,
            PropTypes.func.isRequired
        ]),
        taskStatus: PropTypes.number,
        onAddLines: PropTypes.func
    };

    constructor(props){
        super();

        this.state = {
            lines: [],
            currentRf: 0,
            rf: PipelineSteps.get(),
            loaded: false
        };

        this.imageUpload = {
            action: "imageupload",
            label: "Image Resize / Upload",
            icon: "fa fa-image"
        };

        // Add a post processing step
        this.state.rf.push({
            action: "postprocessing",
            label: "Post Processing",
            icon: "fa fa-file-archive-o",
            beginsWith: "Running ODM OrthoPhoto Cell - Finished",
            endsWith: null
        });

        this.addLines = this.addLines.bind(this);
        this.setupDynamicSource = this.setupDynamicSource.bind(this);
        this.reset = this.reset.bind(this);
        this.tearDownDynamicSource = this.tearDownDynamicSource.bind(this);
        this.getRfEndStatus = this.getRfEndStatus.bind(this);
        this.getRfRunningStatus = this.getRfRunningStatus.bind(this);
        this.suffixFor = this.suffixFor.bind(this);
        this.updateRfState = this.updateRfState.bind(this);
        this.getInitialStatus = this.getInitialStatus.bind(this);
    }

    componentDidMount(){
        this.reset();
    }

    setupDynamicSource(){
        const updateFromSource = () => {
            let sourceUrl = typeof this.props.source === 'function' ?
                            this.props.source(this.state.lines.length) :
                            this.props.source;

            // Fetch
            this.sourceRequest = $.get(sourceUrl, text => {
                    if (text !== ""){
                        let lines = text.split("\n");
                        this.addLines(lines);
                    }
                })
                .always((_, textStatus) => {
                    if (textStatus !== "abort" && this.props.refreshInterval !== undefined){
                        this.sourceTimeout = setTimeout(updateFromSource, this.props.refreshInterval);
                    }
                    if (!this.state.loaded) this.setState({loaded: true});
                });
        };

        updateFromSource();
    }

    getRfEndStatus(){
        return this.props.taskStatus === StatusCodes.COMPLETED ? 
                'completed' : 
                'errored';
    }

    getRfRunningStatus(){
        return [StatusCodes.RUNNING, StatusCodes.QUEUED].indexOf(this.props.taskStatus) !== -1 ?
                                        'running' :
                                        'errored';
    }

    getInitialStatus(){
        if ([null, StatusCodes.QUEUED, StatusCodes.RUNNING].indexOf(this.props.taskStatus) !== -1){
            return 'queued';
        }else{
            return this.getRfEndStatus();
        }
    }

    reset(){
        this.state.rf.forEach(p => {
            p.state = this.getInitialStatus();
        });

        if ([StatusCodes.RUNNING].indexOf(this.props.taskStatus) !== -1){
            this.state.rf[0].state = 'running';
        }

        this.tearDownDynamicSource();
        this.setState({lines: [], currentRf: 0, loaded: false, rf: this.state.rf});
        this.setupDynamicSource();
    }

    tearDownDynamicSource(){
        if (this.sourceTimeout) clearTimeout(this.sourceTimeout);
        if (this.sourceRequest) this.sourceRequest.abort();
    }

    componentDidUpdate(prevProps){
        
        let taskFailed;
        let taskCompleted;
        let taskRestarted;

        taskFailed = [StatusCodes.FAILED, StatusCodes.CANCELED].indexOf(this.props.taskStatus) !== -1;
        taskCompleted = this.props.taskStatus === StatusCodes.COMPLETED;
        
        if (prevProps.taskStatus !== this.props.taskStatus){
            taskRestarted = this.props.taskStatus === null;
        }
        
        this.updateRfState(taskFailed, taskCompleted, taskRestarted);
    }

    componentWillUnmount(){
        this.tearDownDynamicSource();
    }

    addLines(lines){
        if (!Array.isArray(lines)) lines = [lines];

        let currentRf = this.state.currentRf;

        const updateRf = (rfIndex, line) => {
            const current = this.state.rf[rfIndex];
            if (!current) return;

            if (current.beginsWith && line.endsWith(current.beginsWith)){
                current.state = this.getRfRunningStatus();
                
                // Set previous as done
                if (this.state.rf[rfIndex - 1]){
                    this.state.rf[rfIndex - 1].state = 'completed';
                }
            }else if (current.endsWith && line.endsWith(current.endsWith)){
                current.state = this.getRfEndStatus();
                
                // Check next
                updateRf(rfIndex + 1, line);

                currentRf = rfIndex + 1;
            }
        };

        lines.forEach(line => {
            updateRf(currentRf, line);
        });

        this.setState(update(this.state, {
            lines: {$push: lines}
        }));
        this.setState({
            rf: this.state.rf,
            currentRf
        });
        this.updateRfState();

        if (this.props.onAddLines) this.props.onAddLines(lines);
    }

    updateRfState(taskFailed, taskCompleted, taskRestarted){
        // If the task has just failed, update all items that were either running or in queued state
        if (taskFailed){
            this.state.rf.forEach(p => {
                if (p.state === 'queued' || p.state === 'running') p.state = this.getInitialStatus();
            });
        }

        // If completed, all steps must have completed
        if (taskCompleted){
            this.state.rf.forEach(p => p.state = 'completed');
        }

        if (taskRestarted){
            this.state.rf.forEach(p => p.state = 'queued');
        }
    }

    suffixFor(state){
        if (state === 'running'){
            return (<span>...</span>);
        }else if (state === 'completed'){
            return (<i className="fa fa-check"></i>);
        }else if (state === 'errored'){
            return (<i className="fa fa-times"></i>);
        }
    }

    render() {
        const { rf, loaded } = this.state;
        const imageUploadState = this.props.taskStatus === null 
                                ? 'running' 
                                : 'completed';

        return (<div className={"basic-task-view " + (loaded ? 'loaded' : '')}>
            <div className={imageUploadState + " processing-step"}>
                <i className={this.imageUpload.icon + " fa-fw"}></i> {this.imageUpload.label} {this.suffixFor(imageUploadState)}
            </div>
            {rf.map(p => {
                const state = loaded ? p.state : 'queued';

                return (<div key={p.action} className={state + " processing-step"}>
                    <i className={p.icon + " fa-fw"}></i> {p.label} {this.suffixFor(state)}
                </div>);
            })}
        </div>);
    }
}

export default BasicTaskView;
