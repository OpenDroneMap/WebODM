import PropTypes from 'prop-types';
import { Component } from "react";
import { Modal } from "react-bootstrap";
import "./ErrorDialog.scss";

export default class ErrorDialog extends Component {
	static propTypes = {
		errorMessage: PropTypes.string.isRequired,
  }
	
	constructor(props){
		super(props);

		this.state = { show: true };
	}
	
	handleOnHide = () => this.setState({show: false});
	
	render() {
		const { errorMessage } = this.props;
		
		return (
			<Modal show={this.state.show}>
				<Modal.Header closeButton onHide={this.handleOnHide}>
					<Modal.Title>
						There was an error with Cloud Import :(
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{ errorMessage }
				</Modal.Body>
			</Modal>
		);
	}
}
