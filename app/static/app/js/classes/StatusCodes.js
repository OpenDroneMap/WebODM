let statusCodes = {
    10: {
        descr: "Queued",
        icon: "glyphicon glyphicon-hourglass"
    },
    20: {
        descr: "Running",
        icon: "fa fa-gear fa-spin fa-fw"
    },
    30: {
        descr: "Failed",
        icon: "glyphicon glyphicon-remove-circle"
    },
    40: {
        descr: "Completed",
        icon: "glyphicon glyphicon-ok-circle"
    },
    50: {
        descr: "Canceled",
        icon: "glyphicon glyphicon-ban-circle"
    }
};

export default {
    description: function(statusCode) {
      if (statusCodes[statusCode]) return statusCodes[statusCode].descr;
      else return "Uploading";
    },

    icon: function(statusCode){
      if (statusCodes[statusCode]) return statusCodes[statusCode].icon;
      else return "glyphicon glyphicon-upload";
    }
};

