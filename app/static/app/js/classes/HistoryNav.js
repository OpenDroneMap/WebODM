import Utils from './Utils';

const SEP = ",";

class HistoryNav{
  constructor(history){
    this.history = history;
  }

  changeQS(param, value){
    this.history.replace(
      this.history.location.pathname + 
      Utils.replaceSearchQueryParam(this.history.location, param, value) + 
      this.history.location.hash);
  }

  isValueInQSList(param, value){
    let q = Utils.queryParams(this.history.location);
    if (q[param]){
      return q[param].split(SEP).find(v => v == value);
    }else return false;
  }

  addToQSList(param, value){
  	let q = Utils.queryParams(this.history.location);
  	if (q[param]){
      if (!this.isValueInQSList(param, value)){
  		  this.changeQS(param, q[param] + SEP + value);
      }
  	}else{
  		this.changeQS(param, value);
  	}
  }

  removeFromQSList(param, value){
  	let q = Utils.queryParams(this.history.location);
  	if (q[param]){
  		let parts = q[param].split(SEP);
  		this.changeQS(param,
  				parts.filter(p => p != value).join(SEP)
  			);
  	}
  }

  toggleQSListItem(param, value, add){
    if (add){
      this.addToQSList(param, value);
    }else{
      this.removeFromQSList(param, value);
    }
  }
}

export default HistoryNav;

