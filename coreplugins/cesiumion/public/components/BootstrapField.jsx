import React from 'react';
import PropTypes from 'prop-types';

const BootstrapFieldComponent = ({
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
    const ControlComponent = type === "checkbox" ? "input" : type === "textarea" || type === "select" ? type : "input";

    return (
        <div className={`form-group${isError ? ' has-error' : ''}`} style={{ marginLeft: 0, marginRight: 0 }}>
            {label && <label htmlFor={name} className="control-label">{label}</label>}
            <ControlComponent
                id={name}
                name={name}
                className="form-control"
                type={type}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                {...props}
            />
            {isError && <span className="help-block">{error}</span>}
            {help && !isError && <span className="help-block">{help}</span>}
            {isError && showIcon && <span className="glyphicon glyphicon-remove form-control-feedback"></span>}
        </div>
    );
};

BootstrapFieldComponent.propTypes = {
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

class BootstrapField extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: props.value || '',
            touched: false,
            error: ''
        };
    }

    handleChange = (e) => {
        const { value } = e.target;
        this.setState({ value }, () => {
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
            <BootstrapFieldComponent
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

BootstrapField.propTypes = {
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
    help: PropTypes.string,
    type: PropTypes.string,
    showIcon: PropTypes.bool,
    validate: PropTypes.func,
    onChange: PropTypes.func,
    onBlur: PropTypes.func
};

export { BootstrapFieldComponent };
export default BootstrapField;