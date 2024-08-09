import React from "react";
import { connect } from "formik";

class FormikErrorFocus extends React.Component {
    isObject(value) {
        return (
            value && typeof value === "object" && value.constructor === Object
        );
    }
    getKeysRecursively = object => {
        if (!this.isObject(object)) {
            return "";
        }
        const currentKey = Object.keys(object)[0];
        if (!this.getKeysRecursively(object[currentKey])) {
            return currentKey;
        }
        return currentKey + "." + this.getKeysRecursively(object[currentKey]);
    };
    componentDidUpdate(prevProps) {
        const { isSubmitting, isValidating, errors } = prevProps.formik;
        const keys = Object.keys(errors);
        if (keys.length > 0 && isSubmitting && !isValidating) {
            const selectorKey = this.getKeysRecursively(errors);
            const selector = `[id="${selectorKey}"], [name="${selectorKey}"] `;
            const errorElement = document.querySelector(selector);
            if (errorElement) errorElement.focus();
            console.warn(errors);
        }
    }
    render() {
        return null;
    }
}
export default connect(FormikErrorFocus);
