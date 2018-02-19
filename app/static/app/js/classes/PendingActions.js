const CANCEL = 1,
      REMOVE = 2,
      RESTART = 3,
      RESIZE = 4;

let pendingActions = {
    [CANCEL]: {
        descr: "Canceling..."
    },
    [REMOVE]: {
        descr: "Deleting..."
    },
    [RESTART]: {
        descr: "Restarting..."
    },
    [RESIZE]: {
      descr: "Resizing images..."
    }
};

export default {
    CANCEL: CANCEL,
    REMOVE: REMOVE,
    RESTART: RESTART,
    RESIZE: RESIZE,

    description: function(pendingAction) {
      if (pendingActions[pendingAction]) return pendingActions[pendingAction].descr;
      else return "";
    }
};

