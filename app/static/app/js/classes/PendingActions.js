const CANCEL = 1,
      REMOVE = 2,
      RESTART = 3;

let pendingActions = {
    [CANCEL]: {
        descr: "Canceling..."
    },
    [REMOVE]: {
        descr: "Deleting..."
    },
    [RESTART]: {
        descr: "Restarting..."
    }
};

export default {
    CANCEL: CANCEL,
    REMOVE: REMOVE,
    RESTART: RESTART,

    description: function(pendingAction) {
      if (pendingActions[pendingAction]) return pendingActions[pendingAction].descr;
      else return "";
    }
};

