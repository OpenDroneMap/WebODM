export default {
    get: function(){
        return [{
                action: "dataset",
                label: "Load Dataset",
                icon: "fa fa-database"
            },
            {
                action: "opensfm",
                label: "Structure From Motion / MVS",
                icon: "fa fa-camera"
            },
            {
                action: "odm_meshing",
                label: "Meshing",
                icon: "fa fa-cube"
            },
            {
                action: "mvs_texturing",
                label: "Texturing",
                icon: "fab fa-connectdevelop"
            },
            {
                action: "odm_georeferencing",
                label: "Georeferencing",
                icon: "fa fa-globe"
            },
            {
                action: "odm_dem",
                label: "DEM",
                icon: "fa fa-chart-area"
            },
            {
                action: "odm_orthophoto",
                label: "Orthophoto",
                icon: "far fa-image"
            },
            {
                action: "odm_report",
                label: "Report",
                icon: "far fa-file-alt"
            }
        ];
    }
};
