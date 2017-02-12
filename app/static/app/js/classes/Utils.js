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
};

