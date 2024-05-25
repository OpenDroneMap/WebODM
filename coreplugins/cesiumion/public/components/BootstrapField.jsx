function getIn(obj, path) {
    return path.split('.').reduce((o, p) => (o || {})[p], obj);
}

function BootstrapFieldComponent({
    field,
    form: { touched, errors },
    label,
    help,
    type = "",
    showIcon = true,
    ...props
}) {
    const isError = getIn(errors, field.name) && getIn(touched, field.name);
    const errorMsg = getIn(errors, field.name);
    let ControlComponent = 'input';

    const testType = type.toLowerCase();
    if (testType === "checkbox") ControlComponent = 'input';
    else if (testType === "textarea" || testType === "select")
        ControlComponent = testType;
    else props.type = type;

    const div = document.createElement('div');
    div.id = field.name;
    div.style.marginLeft = 0;
    div.style.marginRight = 0;

    if (label) {
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        div.appendChild(labelElement);
    }

    const controlElement = document.createElement(ControlComponent);
    controlElement.setAttribute('name', field.name);
    controlElement.setAttribute('value', field.value);
    div.appendChild(controlElement);

    if (isError) {
        const span = document.createElement('span');
        span.textContent = errorMsg;
        div.appendChild(span);
    }

    if (help && !isError) {
        const span = document.createElement('span');
        span.textContent = help;
        div.appendChild(span);
    }

    return div;
};

function BootstrapField(props) {
    return BootstrapFieldComponent(props);
};

export { BootstrapFieldComponent };
export default BootstrapField;