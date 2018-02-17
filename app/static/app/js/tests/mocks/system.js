// Define a mock for System.JS
export default {
	import: function(dep){
		throw new Error("Not implemented")
	},

	config: function(conf){
		// Nothing
	}
}