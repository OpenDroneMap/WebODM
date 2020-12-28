import Utils from './Utils';
import { _, interpolate } from './gettext';

class PresetUtils{

  // Merge a set of options specified in a preset with
  // those available from a processing node, while populating
  // an extra "defaultValue" field as appropriate
  // @return available options.
  static getAvailableOptions(presetOptions, nodeOptions){
    let result = Utils.clone(nodeOptions);

    result.forEach(opt => {
        if (!opt.defaultValue){
            let presetOpt;
            if (Array.isArray(presetOptions)){
              presetOpt = presetOptions.find(to => to.name == opt.name);
            }

            if (presetOpt){
              opt.defaultValue = opt.value;
              opt.value = presetOpt.value;
            }else{
              opt.defaultValue = opt.value !== undefined ? opt.value : "";
              delete(opt.value);
            }
        }

        if (typeof opt.help === "string"){
            opt.help = interpolate(_(opt.help), {
                choices: Array.isArray(opt.domain) ? opt.domain.join(", ") : opt.domain,
                'default': opt.defaultValue === "" ? "\"\"" : opt.defaultValue
            });
        }
    });

    // Sort by name ascending
    result.sort((a, b) => a.name < b.name ? -1 : 1);

    return result;
  }
}

export default PresetUtils;

