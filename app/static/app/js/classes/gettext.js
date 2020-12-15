// These are already exported by Django

module.exports = {
    gettext: window.gettext,
    _: window.gettext,
    interpolate: function(text, params = {}){
        return window.interpolate(text, params, true);
    }
}