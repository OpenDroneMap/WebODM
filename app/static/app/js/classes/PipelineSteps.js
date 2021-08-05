import { _ } from './gettext';

export default {
    get: function(){
        return [{
                action: "dataset",
                label: _("Load Dataset"),
                icon: "fa fa-database"
            },
            {
                action: "opensfm",
                label: _("Structure From Motion"),
                icon: "fa fa-camera"
            },
            {
                action: "openmvs",
                label: _("Multi View Stereo"),
                icon: "fa fa-braille"
            },
            {
                action: "odm_filterpoints",
                label: _("Point Filtering"),
                icon: "fa fa-filter"
            },
            {
                action: "odm_meshing",
                label: _("Meshing"),
                icon: "fa fa-cube"
            },
            {
                action: "mvs_texturing",
                label: _("Texturing"),
                icon: "fab fa-connectdevelop"
            },
            {
                action: "odm_georeferencing",
                label: _("Georeferencing"),
                icon: "fa fa-globe"
            },
            {
                action: "odm_dem",
                label: _("DEM"),
                icon: "fa fa-chart-area"
            },
            {
                action: "odm_orthophoto",
                label: _("Orthophoto"),
                icon: "far fa-image"
            },
            {
                action: "odm_report",
                label: _("Report"),
                icon: "far fa-file-alt"
            },
            {
                action: "odm_postprocess",
                label: _("Postprocess"),
                icon: "fa fa-cog"
            }
        ];
    }
};
