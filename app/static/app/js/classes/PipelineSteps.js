export default {
    get: function(){
        return [{
                action: "dataset",
                label: "Load Dataset",
                icon: "fa fa-database",
                beginsWith: "Running ODM Load Dataset Cell",
                endsWith: "Running ODM Load Dataset Cell - Finished"
            },
            {
                action: "opensfm",
                label: "Structure From Motion / MVS",
                icon: "fa fa-camera",
                beginsWith: "Running ODM OpenSfM Cell",
                endsWith: "Running ODM Meshing Cell"
            },
            {
                action: "odm_meshing",
                label: "Meshing",
                icon: "fa fa-cube",
                beginsWith: "Running ODM Meshing Cell",
                endsWith: "Running ODM Meshing Cell - Finished"
            },
            {
                action: "mvs_texturing",
                label: "Texturing",
                icon: "fa fa-connectdevelop",
                beginsWith: "Running MVS Texturing Cell",
                endsWith: "Running ODM Texturing Cell - Finished"
            },
            {
                action: "odm_georeferencing",
                label: "Georeferencing",
                icon: "fa fa-globe",
                beginsWith: "Running ODM Georeferencing Cell",
                endsWith: "Running ODM Georeferencing Cell - Finished"
            },
            {
                action: "odm_dem",
                label: "DEM",
                icon: "fa fa-area-chart",
                beginsWith: "Running ODM DEM Cell",
                endsWith: "Running ODM DEM Cell - Finished"
            },
            {
                action: "odm_orthophoto",
                label: "Orthophoto",
                icon: "fa fa-map-o",
                beginsWith: "Running ODM Orthophoto Cell",
                endsWith: "Running ODM OrthoPhoto Cell - Finished"
            }
        ];
    }
};
