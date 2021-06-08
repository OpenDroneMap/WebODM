PluginsAPI.Dashboard.addTaskActionButton([
        'openaerialmap/build/ShareButton.js'
    ],function(args, ShareButton){
        var task = args.task;

        if (task.available_assets.indexOf("orthophoto.tif") !== -1){
            return React.createElement(ShareButton, {task: task, token: "${token}"});
        }
    }
);