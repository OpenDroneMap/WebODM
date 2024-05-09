// localStorage might fail in certain circumstances
// (for example, private browsing on iOS safari)
// but we don't want to cause a total breakdown

class Storage{
	static getItem(key){
		try{
			return localStorage.getItem(key)
		}catch(e){
			console.warn("Failed to call getItem " + key, e);
		}
	}

	static setItem(key, value){
		try{
			localStorage.setItem(key, value);
		}catch(e){
			console.warn("Failed to call setItem " + key, e);
		}
	}

	static removeItem(key){
		try{
			localStorage.removeItem(key);
		}catch(e){
			console.warn("Failed to call removeItem " + key, e);
		}
	}
}

export default Storage;