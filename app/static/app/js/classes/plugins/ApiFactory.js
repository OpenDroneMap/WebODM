import SystemJS from 'SystemJS';

export default class ApiFactory{
  // @param events {EventEmitter}
  constructor(events){
    this.events = events; 
  }

  // @param api {Object}
  create(api){
    // Adds two functions to obj
    // - eventName
    // - triggerEventName
    // We could just use events, but methods
    // are more robust as we can detect more easily if 
    // things break
    const addEndpoint = (obj, eventName, preTrigger = () => {}) => {
      const emitResponse = (...args) => {
        // Timeout needed for modules that have no dependencies
        // and load synchronously. Gives time to setup the listeners.
        setTimeout(() => {
          this.events.emit(`${api.namespace}::${eventName}::Response`, ...args);
        }, 0);
      };

      obj[eventName] = (callbackOrDeps, callbackOrUndef) => {
        if (Array.isArray(callbackOrDeps)){
          // Deps
          // Load dependencies, then raise event as usual
          // by appending the dependencies to the argument list
          this.events.addListener(`${api.namespace}::${eventName}`, (...args) => {
            Promise.all(callbackOrDeps.map(dep => SystemJS.import(dep)))
              .then((...deps) => {
                emitResponse(callbackOrUndef(...(Array.from(args).concat(...deps))));
              });
            });
        }else{
          // Callback
          this.events.addListener(`${api.namespace}::${eventName}`, (...args) => {
            emitResponse(callbackOrDeps(...args));
          });
        }
      }

      const triggerEventName = "trigger" + eventName[0].toUpperCase() + eventName.slice(1);

      obj[triggerEventName] = (params, responseCb) => {
        preTrigger(params, responseCb);
        if (responseCb){
          this.events.addListener(`${api.namespace}::${eventName}::Response`, (...args) => {
            // Give time to all listeners to receive the replies
            // then remove the listener to avoid sending duplicate responses
            const curSub = this.events._currentSubscription;

            setTimeout(() => {
              curSub.remove();
            }, 0);

            responseCb(...args);
          });
        }
        this.events.emit(`${api.namespace}::${eventName}`, params);
      };
    }

    let obj = {};
    api.endpoints.forEach(endpoint => {
      if (!Array.isArray(endpoint)) endpoint = [endpoint];
      addEndpoint(obj, ...endpoint);
    });

    if (api.helpers){
      obj = Object.assign(obj, api.helpers);
    }

    return obj;
  }

}

