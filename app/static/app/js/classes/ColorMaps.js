export default {
    decode: function(color_maps) {
      // Color maps are sent encoded by the server

      if (Array.isArray(color_maps)){
        color_maps.forEach(cm => {
            if (Array.isArray(cm.color_map)){
                cm.decoded_color_map = cm.color_map.map(v => {
                return [
                    (v >> 24) & 0xFF,  // R
                    (v >> 16) & 0xFF,  // G
                    (v >> 8) & 0xFF,   // B
                    v & 0xFF           // A
                ];
                });
            }
        });
      }
    },

};

