// These are already exported by Django

module.exports = {
    gettext: window.gettext,
    _: window.gettext,
    interpolate: function(text, params = {}){
        return window.interpolate(text, params, true);
    },
    get_format: function(format_type){
        return window.get_format(format_type);
    } 
}