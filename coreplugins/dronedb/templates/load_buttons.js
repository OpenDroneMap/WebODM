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


PluginsAPI.Dashboard.addTaskActionButton(
    ["dronedb/build/TaskView.js", "dronedb/build/TaskView.css"],
	function(args, TaskView) {
		var reactElement;
		$.ajax({
			url: "{{ api_url }}/projects/" + args.task.project + "/tasks/" + args.task.id + "/checkforurl",
			dataType: 'json',
			async: false,
			success: function(data) {
				if (data.ddbUrl) {
					reactElement = React.createElement(TaskView, {
						ddbUrl: data.ddbUrl,
					});
				}
			}
		});
		return reactElement;
	}
);
