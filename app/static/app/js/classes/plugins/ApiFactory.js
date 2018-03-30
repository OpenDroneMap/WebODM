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
      obj[eventName] = (callbackOrDeps, callbackOrUndef) => {
        if (Array.isArray(callbackOrDeps)){
          // Deps
          // Load dependencies, then raise event as usual
          // by appending the dependencies to the argument list
          this.events.addListener(`${api.namespace}::${eventName}`, (...args) => {
            Promise.all(callbackOrDeps.map(dep => SystemJS.import(dep)))
              .then((...deps) => {
                callbackOrUndef(...(Array.from(args).concat(...deps)));
              });
            });
        }else{
          // Callback
          this.events.addListener(`${api.namespace}::${eventName}`, callbackOrDeps);
        }
      }

      const triggerEventName = "trigger" + eventName[0].toUpperCase() + eventName.slice(1);

      obj[triggerEventName] = (...args) => {
        preTrigger(...args);
        this.events.emit(`${api.namespace}::${eventName}`, ...args);
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

