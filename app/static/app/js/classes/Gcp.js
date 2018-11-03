class Gcp{
  constructor(text){
    this.text = text;
  }

  // Scale the image location of GPCs
  // according to the values specified in the map
  // @param imagesRatioMap {Object} object in which keys are image names and values are scaling ratios
  //    example: {'DJI_0018.jpg': 0.5, 'DJI_0019.JPG': 0.25}
  // @return {Gcp} a new GCP object
  resize(imagesRatioMap, muteWarnings = false){
    // Make sure dict is all lower case and values are floats
    let ratioMap = {};
    for (let k in imagesRatioMap) ratioMap[k.toLowerCase()] = parseFloat(imagesRatioMap[k]);

    const lines = this.text.split(/\r?\n/);
    let output = "";

    if (lines.length > 0){
      output += lines[0] + '\n'; // coordinate system description

      for (let i = 1; i < lines.length; i++){
        let line = lines[i].trim();
        if (line !== "" && line[0] !== "#"){
          let parts = line.split(/\s+/);
          if (parts.length >= 6){
            let [x, y, z, px, py, imagename, ...extracols] = parts;
            let ratio = ratioMap[imagename.toLowerCase()];

            px = parseFloat(px);
            py = parseFloat(py);

            if (ratio !== undefined){
              px *= ratio;
              py *= ratio;
            }else{
              if (!muteWarnings) console.warn(`${imagename} not found in ratio map. Are you missing some images?`);
            }

            let extra = extracols.length > 0 ? ' ' + extracols.join(' ') : '';
            output += `${x} ${y} ${z} ${px.toFixed(8)} ${py.toFixed(8)} ${imagename}${extra}\n`;
          }else{
            if (!muteWarnings) console.warn(`Invalid GCP format at line ${i}: ${line}`);
            output += line + '\n';
          }
        }
      }
    }

    return new Gcp(output);
  }

  toString(){
    return this.text;
  }
}

module.exports = Gcp;
