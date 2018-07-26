PluginsAPI.Dashboard.addTaskActionButton(function(options){

    console.log("INVOKED");

    return {
        button: React.createElement("button", {
                    type: "button",
                    className: "btn btn-sm btn-primary",
                    onClick: function(){
                        console.log("HEY");
                    }
                }, React.createElement("i", {className: "oam-icon fa"}, ""), " Share to OAM"),
        task: options.task
    };
});