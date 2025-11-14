import { _, interpolate } from './gettext';

class Gcp{
  constructor(text){
    this.crs = "";
    this.errors = [];
    // this.entries = [];

    const lines = text.split(/\r?\n/);

    if (lines.length > 0){
      this.crs = lines[0];

      // Check header
      let c = this.crs.toUpperCase();
      console.log(c);
      if (!c.startsWith("WGS84") && !c.startsWith("+PROJ") && !c.startsWith("EPSG:")){
        this.errors.push(interpolate(_("Invalid CRS: %(line)s"), { line: this.crs } ));
      }

      for (let i = 1; i < lines.length; i++){
        let line = lines[i].trim();
        if (line !== "" && line[0] !== "#"){
          let parts = line.split(/\s+/);
          if (parts.length >= 6){
            let [x, y, z, px, py, imagename, ...extracols] = parts;

            px = parseFloat(px);
            py = parseFloat(py);
            x = parseFloat(x);
            y = parseFloat(y);
            z = parseFloat(y);
            if (isNaN(px) || isNaN(py) || isNaN(x) || isNaN(y)){
              this.errors.push(interpolate(_("Invalid line %(num)s: %(line)s"), { num: i + 1, line }));
              continue;
            }
          }else{
            this.errors.push(interpolate(_("Invalid line %(num)s: %(line)s"), { num: i + 1, line }));
          }
        }
      }

    }else{
      this.errors.push(_("Empty GCP file"));
    }
  }

  valid(){
    return this.errors.length === 0;
  }
}

export default Gcp;
