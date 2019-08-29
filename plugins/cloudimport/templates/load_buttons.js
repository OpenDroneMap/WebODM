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
