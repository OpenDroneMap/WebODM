const QUEUED = 10,
      RUNNING = 20,
      FAILED = 30,
      COMPLETED = 40,
      CANCELED = 50;

let statusCodes = {
    [QUEUED]: {
        descr: "Queued",
        icon: "fa fa-hourglass-3"
    },
    [RUNNING]: {
        descr: "Running",
        icon: "fa fa-gear fa-spin fa-fw"
    },
    [FAILED]: {
        descr: "Failed",
        icon: "fa fa-frown-o"
    },
    [COMPLETED]: {
        descr: "Completed",
        icon: "fa fa-check"
    },
    [CANCELED]: {
        descr: "Canceled",
        icon: "fa fa-ban"
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
      else return "fa fa-gear fa-spin";
    }
};

