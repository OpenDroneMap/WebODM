import { Formik, Field, getIn } from "formik";

import {
	FormGroup,
	ControlLabel,
	FormControl,
	Checkbox,
	HelpBlock
} from "react-bootstrap";

const BootstrapFieldComponent = ({
	field,
	form: { touched, errors },
	label,
	help,
	type = "",
	showIcon = true,
	...props
}) => {
	const isError = getIn(errors, field.name) && getIn(touched, field.name);
	const errorMsg = getIn(errors, field.name);
	let ControlComponent = FormControl;

	const testType = type.toLowerCase();
	if (testType === "checkbox") ControlComponent = Checkbox;
	else if (testType === "textarea" || testType === "select")
		props.componentClass = testType;
	else props.type = type;

	return (
		<FormGroup
			controlId={field.name}
			validationState={isError ? "error" : null}
			style={{ marginLeft: 0, marginRight: 0 }}
		>
			{label && <ControlLabel>{label}</ControlLabel>}
			<ControlComponent {...field} {...props} />
			{isError && <HelpBlock>{errorMsg}</HelpBlock>}
			{help && !isError && <HelpBlock>{help}</HelpBlock>}
			{isError && showIcon && <FormControl.Feedback />}
		</FormGroup>
	);
};

const BootstrapField = props => (
	<Field component={BootstrapFieldComponent} {...props} />
);

export { BootstrapFieldComponent };
export default BootstrapField;
