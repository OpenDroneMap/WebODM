import Utils from './Utils';

class HistoryNav{
  constructor(history){
    this.history = history;
  }

  changeQueryString(param, value){
    this.history.replace(
      this.history.location.pathname + 
      Utils.replaceSearchQueryParam(this.history.location, param, value) + 
      this.history.location.hash);
  }
}

export default HistoryNav;

