import PropTypes from 'prop-types';
import { Component } from "react";
import { Modal } from "react-bootstrap";
import NewTaskPanel from "webodm/components/NewTaskPanel";

import "./ConfigureNewTaskDialog.scss";

export default class ConfigureNewTaskDialog extends Component {
	static defaultProps = {
		
	};
	static propTypes = {
		onHide: PropTypes.func.isRequired,
		onSaveTask: PropTypes.func.isRequired,
		ddbRes: PropTypes.object,		
  	}
	
	render() {
		const {
			onHide,
			onSaveTask,
			ddbRes,
		} = this.props;

		return (
			<Modal className={"new-task"} onHide={onHide} show={true} dialogClassName="modal-newtask">
				<Modal.Header closeButton>
					<Modal.Title>
						Import from DroneDB
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<NewTaskPanel
						 onSave={onSaveTask}
						 onCancel={onHide}
						 filesCount={ddbRes ? ddbRes.images_count : 0}
						 getFiles={() => []}
						 showResize={false}
						 suggestedTaskName={ddbRes ? ddbRes.name : null}
					 />
				</Modal.Body>
			</Modal>
		);
	}
}
