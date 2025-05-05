const FileSaver = require('file-saver');

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
        if (parts[1] !== undefined){
            params[parts[0]] = parts[1];
        }
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

    buildUrlWithQuery: function(url, params){
        return (url.indexOf("?") !== -1 ? url.slice(0, url.indexOf("?")) : url) + this.toSearchQuery(params);
    },

    buildUrlReplaceParams: function(url, params){
      let q = this.queryParams({search: url});
      for (let k in params){
        q[k] = params[k];
      }
      return this.buildUrlWithQuery(url, q);
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
    },

    assert: function(condition, message) {
        if (!condition) {
            message = message || "Assertion failed";
            if (typeof Error !== "undefined") {
                throw new Error(message);
            }
            throw message; // Fallback
        }
    },

    getCurrentScriptDir: function(){
      let scripts= document.getElementsByTagName('script');
      let path= scripts[scripts.length-1].src.split('?')[0];      // remove any ?query
      let mydir= path.split('/').slice(0, -1).join('/')+'/';  // remove last filename part of path
      return mydir;
    },

    saveAs: function(text, filename){
      var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
      FileSaver.saveAs(blob, filename);
    },

    downloadAs: function(url, filename){
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    // http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
    bytesToSize: function(bytes, decimals = 2){
      if(bytes == 0) return '0 byte';
      var k = 1000; // or 1024 for binary
      var dm = decimals || 3;
      var sizes = ['bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    isMobile: function(){
      return navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
    },

    userInputToFilename(text, extension = ""){
      return text.replace(/[^0-9a-zA-Z-_]+/g, '').replace(/(\s|\/)+/g, "-") + extension;
    },

    uuidv4(){
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : r & 0x3 | 0x8;
        return v.toString(16);
      });
    }
};

