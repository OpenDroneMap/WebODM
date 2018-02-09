const env = {};
(function (environment) {

    /**
     * List of existings modules
     * @type {Object}
     */
    var modules = {};

    /**
     * Array of waiting modules
     * @type {Array}
     */
    var waitingModules = [];

    /**
     * Count created script for control
     * @type {Number}
     */
    var scriptCounter = 1;

    /**
     * Base element check for IE 6-8
     * @type {Node}
     */
    var baseElement = document.getElementsByTagName('base')[0];

    /**
     * Head element
     * @type {Node}
     */
    var head = document.getElementsByTagName('head')[0];

    /**
     * @param {String}   name     the name of the module
     * @param {Array}    deps     dependencies of the module
     * @param {Function} module   module definition
     * @param {String}  dir       relative dir path from which to load files
     */
    function Include (name, deps, module, dir) {
        var self = this;

        if (typeof name !== "string") {
            module = deps;
            deps = name;
            name = null;
        }

        if (deps.constructor !== [].constructor) {
            module = deps;
            deps = [];
        }

        waitingModules.unshift([name, deps, module]);

        /**
         * Uid for script differentiation
         * @type {String}
         */
        self.uid = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 10);

        self.checkModuleLoaded();

        if (deps.length) {
            self.each(deps, self.parseFiles);
        }
    };

    /**
     * Loop trougth an array of element with the given function
     * @param  {Array|NodeList}    array    array to loop
     * @param  {Function} callback function to execute with each element
     */
    Include.prototype.each = function (array, callback) {
        var self = this,
            i;

        for (i = 0; i < array.length; i++) {
            if (array[i] !== undefined && callback.call(self, array[i], i, array) === false) {
                break;
            }
        }
    }

    /**
     * Get element data id
     * @param  {String}  name
     * @param  {Boolean} clean only clean the name
     * @return {String}
     */
    Include.prototype.getId = function (name, clean) {
        return (clean ? '' : this.uid + '-') + name.replace(/[^a-z0-9]+/g, '');
    }

    /**
     * Check if a module is loaded
     */
    Include.prototype.checkModuleLoaded = function () {
        var self = this;

        self.each(waitingModules, function (module, i) {
            var name         = module[0],
                dependencies = module[1],
                exec         = module[2],
                args         = [];

            self.each(dependencies, function (dependencie, n, t) {
                n = dependencie.push ? dependencie[0] : dependencie;
                t = document.querySelector('[data-id*="' + self.getId(n, 1) + '"]');

                if (t && t.nodeName == "LINK") {
                    args.push(null);
                    return;
                }

                if (modules[n] !== undefined) {
                    args.push(modules[n]);
                }
            });

            if (dependencies.length === args.length || dependencies.length === 0) {
                if (name === null && i+1 === waitingModules.length) {
                    waitingModules = [];
                    scriptCounter = 1;
                }

                exec = typeof exec == 'function' ? exec.apply(this, args) : exec;
                modules[name] = exec;
            }
        });
    }

    /**
     * onModuleLoaded
     * @param  {String}  name  name of the module
     * @param  {Number}  index index of the module
     */
    Include.prototype.onModuleLoaded = function (name, index) {
        var self = this;

        // Is this script add a waiting module ? If not, that's a "normal" script file
        if (index > waitingModules.length) {
            scriptCounter--;
            modules[name] = modules[name] || scriptCounter;
        } else if (waitingModules[0][0] === null) {
            waitingModules[0][0] = name;
        }

        self.checkModuleLoaded();
    }

    /**
     * On Load event
     * @param {Event}    event  event of the load
     * @param {Function} caller
     */
    Include.prototype.onLoad = function (event, caller) {
        var self = this,
            target = (event.currentTarget || event.srcElement);

        //Check if the script is realy loaded and executed
        if (event.type !== "load" && target.readyState != "complete") {
            return;
        }

        target.setAttribute('data-loaded', true);
        self.onModuleLoaded(target.getAttribute('data-module'), target.getAttribute('data-count'));

        // Old browser need to use the detachEvent method
        if (target.attachEvent) {
            target.detachEvent('onreadystatechange', caller);
        } else {
            target.removeEventListener('load', caller);
        }
    }

    /**
     * Watch for css load
     * @param  {Element} elem elem to check loading
     */
    Include.prototype.watchCss = function (elem) {
        var self = this,
            sheets = document.styleSheets,
            i = sheets.length,
            href = elem.href.split('//').pop();

        // loop on document stylesheets to check if media is loaded
        while (i--) {
            if (sheets[i].href.indexOf(href) != -1) {
                elem.setAttribute('data-loaded', true);
                self.onModuleLoaded(elem.getAttribute('data-module'), elem.getAttribute('data-count'));
                return;
            }
        }

        setTimeout(function () {
            self.watchCss.call(self, elem);
        });
    }

    /**
     * Attach events to an element
     * @param {Element} elem     elem to attach event
     * @param {Boolean} isJs     is elem a script
     */
    Include.prototype.attachEvents = function (elem, isJs) {
        var self = this,
            cb = function () {
                var args = Array.prototype.slice.call(arguments);
                args.push(cb);

                self.onLoad.apply(self, args);
            };


        if (isJs) {
            if (elem.attachEvent) {
                elem.attachEvent('onreadystatechange', cb);
            } else {
                elem.addEventListener('load', cb, true);
            }
        } else {
            self.watchCss(elem);
        }
    }

    /**
     * Check if a script already load
     * @param  {String} moduleName module to load
     * @param  {String} isJs       type of file
     */
    Include.prototype.checkExists = function (moduleName, isJs) {
        var exists = false;

        this.each(document.getElementsByTagName(isJs ? 'script' : 'link'), function (elem) {
            if (elem.getAttribute('data-module') && elem.getAttribute('data-module') === moduleName) {
                exists = elem;
                return false;
            }
        });

        return exists;
    }

    /**
     * Create a script element to load asked module
     * @param  {String} moduleName name of the module
     * @param  {String} moduleFile file to include
     * @param  {String} isJs       type of file
     */
    Include.prototype.create = function (moduleName, moduleFile, isJs) {
        var self = this;

        //SetTimeout prevent the element create browser rush
        setTimeout(function(){
            var elem = self.checkExists.call(self, moduleName, isJs);

            if (elem) {
                return;
            }

            scriptCounter++;

            elem = document.createElement(isJs ? 'script' : 'link');

            if (isJs) {
                elem.async = true;
                elem.type = "text/javascript";
                elem.src = moduleFile;
            } else {
                elem.media = "all";
                elem.href = moduleFile;
                elem.rel = "stylesheet"
            }

            elem.setAttribute('data-id', self.getId(moduleName));
            elem.setAttribute('data-module', moduleName);
            elem.setAttribute('data-count',  scriptCounter);
            elem.setAttribute('data-loaded', false);

            if (baseElement) {
                //prevent IE 6-8 bug (script executed before appenchild execution.
                baseElement.parentNode.insertBefore(elem, baseElement);
            } else {
                head.appendChild(elem);
            }

            self.attachEvents.call(self, elem, isJs);
        }, 0);
    }

    /**
     * Parse a file to include
     * @param  {String} file  file to parse
     */
    Include.prototype.parseFiles = function (file) {
        var moduleName = file.push ? file[0] : file,
            moduleFile = file.push ? file[1] : file,
            ext;

        //Don't load module already loaded
        if (modules[moduleName]) {
            this.checkModuleLoaded();
            return;
        }


        if (moduleFile.indexOf('//') == -1 && !/\.js/.test(moduleFile) && !/^http/.test(moduleFile)) {
            moduleFile = moduleFile.replace(/\./g, '/');
            moduleFile = moduleFile + '.js';
        }

        ext = moduleFile.split('.').pop() == 'js';

        this.create.call(this, moduleName, moduleFile, ext);
    }

    /**
     * @param {String}   name     the name of the module
     * @param {Array}    deps     dependencies of the module
     * @param {Function} module   module definition
     */
    environment['include'] = environment['require'] = environment['define'] = function (name, deps, module) {
        return new Include(name, deps, module);
    };

})(env);

export default env;
