PluginsAPI.Dashboard.addNewTaskButton(
	["dronedb/build/ImportView.js"],
	function(args, ImportView) {
        return React.createElement(ImportView, {
                onNewTaskAdded: args.onNewTaskAdded,
                projectId: args.projectId,
                apiURL: "{{ api_url }}",
        });
	}
);

PluginsAPI.Dashboard.addTaskActionButton(['dronedb/build/ShareButton.js'],function(args, ShareButton){
	var task = args.task;

	if (task.available_assets !== null && task.available_assets.length > 0){
		return React.createElement(ShareButton, {task: task, token: "${token}"});
	}
}
);