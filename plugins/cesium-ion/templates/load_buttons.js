PluginsAPI.Dashboard.addTaskActionButton(
	["{{ app_name }}/build/TaskView.js"],
	function(args, TaskView) {
		if ("{{ token }}"){
		    return React.createElement(TaskView, {
			task: args.task,
			token: "{{ token }}",
			apiURL: "{{ api_url }}",
			ionURL: "{{ ion_url }}"
		    });
		}
	}
);
