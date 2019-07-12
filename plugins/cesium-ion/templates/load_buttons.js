PluginsAPI.Dashboard.addTaskActionButton(
	["{{ app_name }}/build/TaskView.js"],
	function(args, TaskView) {
		console.log(args);
		return React.createElement(TaskView, {
			task: args.task,
			token: "{{ token }}",
			apiURL: "{{ api_url }}",
			ionURL: "{{ ion_url }}"
		});
	}
);
