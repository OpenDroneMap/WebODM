PluginsAPI.Dashboard.addTaskActionButton([
        'openaerialmap/build/ShareButton.js',
        'openaerialmap/build/ShareButton.css'
    ],function(options, ShareButton){
        var task = options.task;

        if (task.available_assets.indexOf("orthophoto.tif") !== -1){
            console.log("INSTANTIATED");

            return {
                button: React.createElement(ShareButton, {task: task, token: "${token}"}),
                task: task
            };
        }
    }
);