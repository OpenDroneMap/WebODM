PluginsAPI.Dashboard.addNewTaskButton(
	["cloudimport/build/ImportView.js"],
	function(args, ImportView) {
    return React.createElement(ImportView, {
			onNewTaskAdded: args.onNewTaskAdded,
			projectId: args.projectId,
			apiURL: "{{ api_url }}",
    });
	}
);

PluginsAPI.Dashboard.addTaskActionButton(
	["cloudimport/build/TaskView.js"],
	function(args, ImportView) {
    return React.createElement(ImportView, {
			task: args.task,
			apiURL: "{{ api_url }}",
    });
	}
);
