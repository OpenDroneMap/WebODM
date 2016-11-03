const CANCEL = 1,
      DELETE = 2;

let pendingActions = {
    [CANCEL]: {
        descr: "Canceling..."
    },
    [DELETE]: {
        descr: "Deleting..."
    }
};

export default {
    CANCEL: CANCEL,
    DELETE: DELETE,

    description: function(pendingAction) {
      if (pendingActions[pendingAction]) return pendingActions[pendingAction].descr;
      else return "";
    }
};

