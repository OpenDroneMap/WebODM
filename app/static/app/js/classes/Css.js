const values = {};
export default {
    getValue: function(className, property, element = 'div'){
        const k = className + '|' + property;
        if (values[k]) return values[k];
        else{
            let d = document.createElement(element);
            d.style.display = "none";
            d.className = className;
            document.body.appendChild(d);
            values[k] = getComputedStyle(d)[property];
            document.body.removeChild(d);
            return values[k];
        }
    }
}