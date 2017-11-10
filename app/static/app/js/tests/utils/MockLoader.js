const fs = require('fs');
const path = require('path');

module.exports = {
	// Load a mock from the <root>/build/mocks directory
	load: function(mockPath){
		try{
			return JSON.parse(fs.readFileSync(
					path.join(__dirname, "..", "..", "..", "..", "..", "..", "build", "mocks", mockPath), 
					'utf8'
				));
		}catch(e){
			throw new Error(`Invalid mock ${path}: ${e.message}`);
		}
	}
};