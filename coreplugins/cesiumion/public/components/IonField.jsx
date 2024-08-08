import React from 'react';
import PropTypes from 'prop-types';

const IonFieldComponent = ({
    name,
    value,
    label,
    help,
    type = "text",
    showIcon = true,
    error,
    touched,
    onChange,
    onBlur,
    ...props
}) => {
    const isError = error && touched;
    const isCheckbox = type === "checkbox";
    const ControlComponent = isCheckbox ? "input" : (type === "textarea" || type === "select") ? type : "input";

    return (
        <div className={`form-group${isError ? ' has-error' : ''}`} style={{ marginLeft: 0, marginRight: 0 }}>
            {label && !isCheckbox && <label htmlFor={name} className="control-label">{label}</label>}
            <ControlComponent
                id={name}
                name={name}
                className={isCheckbox ? "" : "form-control"}
                type={type}
                value={isCheckbox ? undefined : value}
                checked={isCheckbox ? value : undefined}
                onChange={onChange}
                onBlur={onBlur}
                {...props}
            />
            {label && isCheckbox && <label htmlFor={name} className="control-label">{label}</label>}
            {isError && <span className="help-block">{error}</span>}
            {help && !isError && <span className="help-block">{help}</span>}
            {isError && showIcon && <span className="glyphicon glyphicon-remove form-control-feedback"></span>}
        </div>
    );
};

IonFieldComponent.propTypes = {
    name: PropTypes.string.isRequired,
    value: PropTypes.any,
    label: PropTypes.string,
    help: PropTypes.string,
    type: PropTypes.string,
    showIcon: PropTypes.bool,
    error: PropTypes.string,
    touched: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func.isRequired
};

class IonField extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: props.type === "checkbox" ? props.checked : props.value || '',
            touched: false,
            error: ''
        };
    }

    handleChange = (e) => {
        const { type, checked, value } = e.target;
        const newValue = type === "checkbox" ? checked : value;
        this.setState({ value: newValue }, () => {
            if (this.props.onChange) {
                this.props.onChange(e);
            }
        });
    };

    handleBlur = (e) => {
        this.setState({ touched: true }, () => {
            if (this.props.onBlur) {
                this.props.onBlur(e);
            }
        });
    };

    render() {
        const { name, label, help, type, showIcon, validate, ...props } = this.props;
        const { value, touched, error } = this.state;

        let validationError = error;
        if (validate) {
            validationError = validate(value);
        }

        return (
            <IonFieldComponent
                name={name}
                value={value}
                label={label}
                help={help}
                type={type}
                showIcon={showIcon}
                error={validationError}
                touched={touched}
                onChange={this.handleChange}
                onBlur={this.handleBlur}
                {...props}
            />
        );
    }
}

IonField.propTypes = {
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
    help: PropTypes.string,
    type: PropTypes.string,
    showIcon: PropTypes.bool,
    validate: PropTypes.func,
    onChange: PropTypes.func,
    onBlur: PropTypes.func
};

export { IonFieldComponent };
export default IonField;