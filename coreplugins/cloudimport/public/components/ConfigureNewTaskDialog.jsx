import PropTypes from 'prop-types';
import { Component } from "react";
import { Modal } from "react-bootstrap";
import NewTaskPanel from "webodm/components/NewTaskPanel";

import "./ConfigureNewTaskDialog.scss";

export default class ConfigureNewTaskDialog extends Component {
	static defaultProps = {
		platform: null,
	};
	static propTypes = {
		onHide: PropTypes.func.isRequired,
		onSaveTask: PropTypes.func.isRequired,
		folder: PropTypes.object,
		platform: PropTypes.object,
  }
	
	render() {
		const {
			onHide,
			onSaveTask,
			platform,
			folder,
		} = this.props;

		const title = "Import from " + (platform !== null ? platform.name : "Platform");
		return (
			<Modal className={"new-task"} onHide={onHide} show={true} dialogClassName="modal-newtask">
				<Modal.Header closeButton>
					<Modal.Title>
						{title}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<NewTaskPanel
						 onSave={onSaveTask}
						 onCancel={onHide}
						 filesCount={folder ? folder.images_count : 0}
						 getFiles={() => []}
						 showResize={false}
						 suggestedTaskName={folder ? folder.name : null}
					 />
				</Modal.Body>
			</Modal>
		);
	}
}
