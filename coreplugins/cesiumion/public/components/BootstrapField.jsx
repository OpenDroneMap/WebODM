import { Formik, Field, getIn } from "formik";
import { Checkbox } from "../../../../app/static/app/js/components/Toggle";

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
    let ControlComponent = 'input';

    const testType = type.toLowerCase();
    if (testType === "checkbox") ControlComponent = Checkbox;
    else if (testType === "textarea" || testType === "select")
        ControlComponent = testType;
    else props.type = type;

    return (
        <div
            id={field.name}
            style={{ marginLeft: 0, marginRight: 0 }}
        >
            {label && <label>{label}</label>}
            <ControlComponent {...field} {...props} />
            {isError && <span>{errorMsg}</span>}
            {help && !isError && <span>{help}</span>}
        </div>
    );
};

const BootstrapField = props => (
	<Field component={BootstrapFieldComponent} {...props} />
);

export { BootstrapFieldComponent };
export default BootstrapField;
