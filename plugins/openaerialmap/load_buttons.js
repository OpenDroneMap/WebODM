PluginsAPI.Dashboard.addTaskActionButton([
        'openaerialmap/build/ShareButton.js',
        'openaerialmap/build/ShareButton.css'
    ],function(args, ShareButton){
        var task = args.task;

        if (task.available_assets.indexOf("orthophoto.tif") !== -1){
            return {
                button: React.createElement(ShareButton, {task: task, token: "${token}"}),
                task: task
            };
        }
    }
);