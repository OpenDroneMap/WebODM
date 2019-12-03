const QUEUED = 10,
      RUNNING = 20,
      FAILED = 30,
      COMPLETED = 40,
      CANCELED = 50;

let statusCodes = {
    [QUEUED]: {
        descr: "Queued",
        icon: "far fa-hourglass fa-fw"
    },
    [RUNNING]: {
        descr: "Running",
        icon: "fa fa-cog fa-spin fa-fw"
    },
    [FAILED]: {
        descr: "Failed",
        icon: "fa fa-times fa-fw"
    },
    [COMPLETED]: {
        descr: "Completed",
        icon: "fa fa-check fa-fw"
    },
    [CANCELED]: {
        descr: "Canceled",
        icon: "fa fa-ban fa-fw"
    }
};

export default {
    QUEUED: QUEUED,
    RUNNING: RUNNING,
    FAILED: FAILED,
    COMPLETED: COMPLETED,
    CANCELED: CANCELED,

    description: function(statusCode) {
      if (statusCodes[statusCode]) return statusCodes[statusCode].descr;
      else return "";
    },

    icon: function(statusCode){
      if (statusCodes[statusCode]) return statusCodes[statusCode].icon;
      else return "fa fa-cog fa-spin";
    }
};

