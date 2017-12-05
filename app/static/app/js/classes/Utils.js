let escapeEntityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

export default {
    // to be used on individual strings
    escapeHtml: function(string) {
      return String(string).replace(/[&<>"'\/]/g, function (s) {
        return escapeEntityMap[s];
      });
    },

    // To be used with tagged templates
    html: function(pieces){
        let result = pieces[0];
        let substitutions = [].slice.call(arguments, 1);
        for (let i = 0; i < substitutions.length; ++i) {
            result += this.escapeHtml(substitutions[i]) + pieces[i + 1];
        }

        return result;
    },

    queryParams: function(location){
      let params = {};
      let paramsRaw = (location.search.replace("?", "").match(/([^&=]+)=?([^&]*)/g) || []);
      for (let i in paramsRaw){
        let parts = paramsRaw[i].split("=");
        params[parts[0]] = parts[1];
      }
      return params;
    },

    toSearchQuery: function(params){
      let parts = [];
      for (let k in params){
        parts.push(k + "=" + params[k]);
      }
      if (parts.length > 0) return "?" + parts.join("&");
      else return "";
    },

    replaceSearchQueryParam: function(location, param, value){
      let q = this.queryParams(location);
      q[param] = value;
      return this.toSearchQuery(q);
    },

    clone: function(obj){
      return JSON.parse(JSON.stringify(obj));
    },

    // "/a/b" --> http://localhost/a/b
    absoluteUrl: function(path, href = window.location.href){
      if (path[0] === '/') path = path.slice(1);

      let parser = document.createElement('a');
      parser.href = href;

      return `${parser.protocol}//${parser.host}/${path}`;
    }
};

