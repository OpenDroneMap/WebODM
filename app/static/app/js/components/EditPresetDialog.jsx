import "../css/EditPresetDialog.scss";
import React from "react";
import FormDialog from "./FormDialog";
import ProcessingNodeOption from "./ProcessingNodeOption";
import PresetUtils from "../classes/PresetUtils";
import PropTypes from "prop-types";
import values from "object.values";
import { _ } from "../classes/gettext";

if (!Object.values) {
  values.shim();
}

// Do not apply to WebODM, can cause confusion
const OPTS_BLACKLIST = [
  "build-overviews",
  "orthophoto-no-tiled",
  "orthophoto-compression",
  "orthophoto-png",
  "orthophoto-kmz",
  "pc-copc",
  "pc-las",
  "pc-ply",
  "pc-csv",
  "pc-ept",
  "cog",
  "gltf",
];

const OPTIONS_GROUPS = [
  {
    id: "input",

    name: _("Input & Preprocessing"),

    icon: "fa fa-image",

    subgroups: [
      {
        id: "camera",
        name: _("Camera Configuration"),
        options: [
          "camera-lens",
          "cameras",
          "use-fixed-camera-params",
          "rolling-shutter",
          "rolling-shutter-readout",
          "ignore-gsd",
        ],
      },

      {
        id: "masks",
        name: _("Masking"),
        options: ["bg-removal", "sky-removal"],
      },

      {
        id: "multispectral",
        name: _("Multispectral"),
        options: [
          "primary-band",
          "radiometric-calibration",
          "skip-band-alignment",
        ],
      },

      {
        id: "video",
        name: _("Video Input"),
        options: ["video-limit", "video-resolution"],
      },
    ],
  },

  {
    id: "boundscrop",

    name: _("Bounds & Cropping"),

    icon: "fa fa-crop",

    subgroups: [
      {
        id: "bounds",
        name: _("Boundary"),
        options: [
          "auto-boundary",
          "auto-boundary-distance",
          "boundary",
          "crop",
        ],
      },
    ],
  },

  {
    id: "crs",

    name: _("Coordinate Reference System"),

    icon: "fa fa-globe",

    subgroups: [{ id: "crs-opts", name: _("Options"), options: ["crs"] }],
  },

  {
    id: "sfm",

    name: _("Structure From Motion"),

    icon: "fa fa-camera",

    subgroups: [
      {
        id: "feature-extraction",
        name: _("Feature Extraction"),
        options: ["feature-type", "feature-quality", "min-num-features"],
      },

      {
        id: "feature-matching",
        name: _("Feature Matching"),
        options: ["matcher-type", "matcher-neighbours", "matcher-order"],
      },

      {
        id: "sparse-reconstruction",
        name: _("Reconstruction"),
        options: [
          "sfm-algorithm",
          "sfm-no-partial",
          "use-hybrid-bundle-adjustment",
          "min-track-length",
        ],
      },

      {
        id: "gps",
        name: _("Georeferencing"),
        options: ["force-gps", "gps-accuracy", "gps-z-offset", "use-exif"],
      },
    ],
  },

  {
    id: "mvs",

    name: _("Point Cloud"),

    icon: "fa fa-braille",

    subgroups: [
      {
        id: "generation",
        name: _("Generation"),
        options: ["depthmap-min-consistent-views"],
      },

      {
        id: "filtering",
        name: _("Filtering"),
        options: ["pc-filter", "pc-skip-geometric", "pc-sample"],
      },

      {
        id: "postprocess",
        name: _("Post-Processing"),
        options: ["pc-classify", "pc-rectify"],
      },
    ],
  },

  {
    id: "mesh",

    name: _("Meshing"),

    icon: "fa fa-cube",

    subgroups: [
      {
        id: "mesh-gen",
        name: _("Mesh Generation"),
        options: ["skip-3dmodel", "mesh-octree-depth", "mesh-size"],
      },
    ],
  },

  {
    id: "texturing",

    name: _("Texturing"),

    icon: "fab fa-connectdevelop",

    subgroups: [
      {
        id: "texture-opts",
        name: _("Texture Options"),
        options: [
          "texturing-single-material",
          "texturing-keep-unseen-faces",
          "texturing-skip-global-seam-leveling",
          "texturing-data-term",
          "texturing-regularization",
        ],
      },
    ],
  },

  {
    id: "dem",

    name: _("Digital Elevation Models"),

    icon: "fa fa-chart-area",

    subgroups: [
      {
        id: "dem-outputs",
        name: _("Outputs"),
        options: ["dsm", "dtm", "dem-euclidean-map"],
      },

      {
        id: "dem-generation",
        name: _("Resolution & Sampling"),
        options: ["dem-resolution", "dem-decimation", "dem-gapfill-steps"],
      },

      {
        id: "smrf",
        name: _("Ground Classification (SMRF)"),
        options: ["smrf-scalar", "smrf-slope", "smrf-threshold", "smrf-window"],
      },
    ],
  },

  {
    id: "orthophoto",

    name: _("Orthophoto"),

    icon: "fa fa-map",

    subgroups: [
      {
        id: "ortho-opts",
        name: _("Orthophoto Options"),
        options: [
          "orthophoto-resolution",
          "fast-orthophoto",
          "orthophoto-cutline",
          "skip-orthophoto",
          "use-3dmesh",
        ],
      },
    ],
  },

  {
    id: "tiles",

    name: _("Tiles"),

    icon: "fas fa-th",

    subgroups: [
      {
        id: "tiles-opts",
        name: _("Tiles Options"),
        options: ["3d-tiles", "tiles"],
      },
    ],
  },

  {
    id: "system",

    name: _("System & Pipeline Control"),

    icon: "fa fa-cogs",

    subgroups: [
      {
        id: "performance",
        name: _("Performance"),
        options: [
          "max-concurrency",
          "no-gpu",
          "optimize-disk-space",
          "skip-report",
        ],
      },

      {
        id: "pipeline",
        name: _("Pipeline Control"),
        options: ["rerun-from", "end-with"],
      },
    ],
  },

  {
    id: "split-merge",

    name: _("Split/Merge"),

    icon: "fa fa-sitemap",

    subgroups: [
      {
        id: "splitting",
        name: _("Splitting"),
        options: ["split", "split-overlap", "sm-cluster"],
      },

      {
        id: "merging",
        name: _("Merging"),
        options: ["merge", "merge-skip-blending", "sm-no-align"],
      },
    ],
  },
];

class EditPresetDialog extends React.Component {
  static defaultProps = {};

  static propTypes = {
    preset: PropTypes.object.isRequired,
    availableOptions: PropTypes.array.isRequired,
    saveAction: PropTypes.func.isRequired,
    deleteAction: PropTypes.func.isRequired,
    onHide: PropTypes.func,
  };

  constructor(props) {
    super(props);

    // Refs to ProcessingNodeOption components
    this.options = {};

    this.state = {
      name: props.preset.name,
      search: "",
      showSearch: false,
      displayLegacyFlatView: false,
      areAnyGroupsOpen: false,
    };

    this.getFormData = this.getFormData.bind(this);
    this.onShow = this.onShow.bind(this);
    this.setOptionRef = this.setOptionRef.bind(this);
    this.getOptions = this.getOptions.bind(this);
    this.isCustomPreset = this.isCustomPreset.bind(this);
  }

  setOptionRef(optionName) {
    return (component) => {
      if (component) this.options[optionName] = component;
    };
  }

  getOptions() {
    return Object.values(this.options)
      .map((option) => {
        return {
          name: option.props.name,
          value: option.getValue(),
        };
      })
      .filter((option) => option.value !== undefined);
  }

  getFormData() {
    return {
      id: this.props.preset.id,
      name: this.state.name,
      options: this.getOptions(),
    };
  }

  isCustomPreset() {
    return this.props.preset.id === -1;
  }

  onShow() {
    if (!this.isCustomPreset()) this.nameInput.focus();
  }

  handleChange(field) {
    return (e) => {
      let state = {};
      state[field] = e.target.value;
      this.setState(state);
    };
  }

  toggleSearchControl = () => {
    this.setState({ showSearch: !this.state.showSearch });
  };

  toggleDisplayLegacyFlatView = () => {
    this.setState({ displayLegacyFlatView: !this.state.displayLegacyFlatView });
  };

  toggleCollapsedGroups = () => {
    if (this.state.areAnyGroupsOpen) {
      this.collapseAllGroups();
    } else {
      this.expandAllGroups();
    }
  };

  collapseAllGroups() {
    document.querySelectorAll("details.group").forEach((detail) => {
      detail.removeAttribute("open");
    });
  }

  expandAllGroups() {
    document.querySelectorAll("details.group").forEach((detail) => {
      detail.setAttribute("open", "");
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.showSearch) {
      this.searchControl.focus();
    }
  }

  areAnyGroupsCurrentlyOpen() {
    const groupDetails = document.querySelectorAll("details.group");
    return Array.from(groupDetails).some((detail) => detail.open);
  }

  updateAreAnyGroupsOpen = () => {
    this.setState({ areAnyGroupsOpen: this.areAnyGroupsCurrentlyOpen() });
  };

  filterOptionsBySearch(options) {
    return options.filter((option) => this.filterOptionBySearch(option));
  }

  filterOptionBySearch(option) {
    return this.state.showSearch && this.state.search !== ""
      ? option.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !==
          -1
      : true;
  }

  countItemsInGroup(group, options) {
    return group.subgroups.reduce(
      (numberOfItemsInGroup, subgroup) =>
        numberOfItemsInGroup + this.countItemsInSubGroup(subgroup, options),
      0,
    );
  }

  countItemsInSubGroup(subgroup, options) {
    return subgroup.options.filter((name) =>
      options.some((option) => option.name === name),
    ).length;
  }

  renderLegacyFlatView(options) {
    return (
      <div className="flat-options">
        {options.map((option) => this.renderOption(option))}
      </div>
    );
  }

  isGroupEmpty(group, options) {
    return this.countItemsInGroup(group, options) === 0;
  }

  isSubGroupEmpty(group, options) {
    return this.countItemsInSubGroup(group, options) === 0;
  }

  filterOutEmptyGroups(groups, options) {
    return groups.filter((group) => !this.isGroupEmpty(group, options));
  }

  filterOutEmptySubgroups(subgroups, options) {
    return subgroups.filter(
      (subgroup) => !this.isSubGroupEmpty(subgroup, options),
    );
  }

  renderGroupedOptions(groups, options) {
    let filteredGroups = this.filterOutEmptyGroups(groups, options);
    return (
      <div className="grouped-options">
        {filteredGroups.map((group) => this.renderGroup(group, options))}
      </div>
    );
  }

  renderGroup(group, options) {
    const number_of_items_in_group = this.countItemsInGroup(group, options);
    const filteredSubgroups = this.filterOutEmptySubgroups(
      group.subgroups,
      options,
    );
    return (
      <div key={group.name}>
        <details
          className={"group group-" + group.name}
          onToggle={this.updateAreAnyGroupsOpen}
        >
          <summary className="group-header">
            <span className="group_information">
              <i className="fa fa-chevron-right toggle-icon"></i>
              <i className={group.icon}></i>
              <span>{group.name}</span>
            </span>
            <span className="groups_number-of-items">
              {number_of_items_in_group}
            </span>
          </summary>
          <div className="group-body">
            {filteredSubgroups.map((subgroup) =>
              this.renderSubGroup(subgroup, options),
            )}
          </div>
        </details>
      </div>
    );
  }

  renderSubGroup(subgroup, options) {
    return (
      <div key={subgroup.name} className={"subgroup subgroup-" + subgroup.name}>
        <div className="subgroup-heading">{subgroup.name}</div>
        {options
          .filter((option) => subgroup.options.includes(option.name))
          .map((option) => this.renderOption(option))}
      </div>
    );
  }

  renderOption(option) {
    return (
      <ProcessingNodeOption
        {...option}
        key={option.name}
        ref={this.setOptionRef(option.name)}
      />
    );
  }

  render() {
    let options = PresetUtils.getAvailableOptions(
      this.props.preset.options,
      this.props.availableOptions,
    ).filter(
      (option) => OPTS_BLACKLIST.indexOf(option.name.toLowerCase()) === -1,
    );

    return (
      <div className="edit-preset-dialog">
        <FormDialog
          {...this.props}
          getFormData={this.getFormData}
          reset={() => {}}
          show={true}
          onShow={this.onShow}
          saveIcon="far fa-edit"
          title={_("Edit Task Options")}
          saveAction={this.props.saveAction}
          deleteWarning={false}
          deleteAction={
            this.props.preset.id !== -1 && !this.props.preset.system
              ? this.props.deleteAction
              : undefined
          }
        >
          {!this.isCustomPreset()
            ? [
                <div className="row preset-name" key="preset">
                  <label className="col-sm-2 control-label">{_("Name")}</label>
                  <div className="col-sm-10" style={{ marginRight: "40px" }}>
                    <input
                      type="text"
                      className="form-control"
                      ref={(domNode) => {
                        this.nameInput = domNode;
                      }}
                      value={this.state.name}
                      onChange={this.handleChange("name")}
                    />
                  </div>
                </div>,
                <hr key="hr" />,
              ]
            : ""}

          <div className="options-toggle-buttons col-sm-12">
            <button
              type="submit"
              className={
                "btn btn-default search-toggle toggle btn-sm " +
                (this.state.showSearch ? "active-toggle" : "")
              }
              title={_("Filter options by Search")}
              onClick={this.toggleSearchControl}
            >
              <i className="fa fa-search"></i>
            </button>

            <button
              type="submit"
              className={
                "btn btn-default flat-toggle toggle btn-sm " +
                (this.state.displayLegacyFlatView ? "active-toggle" : "")
              }
              title={_("View options in legacy flat view (no groups)")}
              onClick={this.toggleDisplayLegacyFlatView}
            >
              <i className="fa fa-layer-group"></i>
            </button>

            {!this.state.displayLegacyFlatView ? (
              this.state.areAnyGroupsOpen ? (
                <button
                  type="submit"
                  className="btn btn-default collapse-toggle toggle btn-sm"
                  title={_("Collapse all groups")}
                  onClick={this.toggleCollapsedGroups}
                >
                  <i className="fa fa-fw fa-angle-double-up"></i>
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-default expand-toggle toggle btn-sm"
                  title={_("Expand all groups")}
                  onClick={this.toggleCollapsedGroups}
                >
                  <i className="fa fa-fw fa-angle-double-down"></i>
                </button>
              )
            ) : (
              <></>
            )}
          </div>

          {this.state.showSearch ? (
            <div className="row search-controls">
              <div className="col-sm-12">
                <input
                  type="text"
                  className="form-control"
                  value={this.state.search}
                  placeholder="Type to filter options by search"
                  ref={(node) => {
                    this.searchControl = node;
                  }}
                  onChange={this.handleChange("search")}
                />
              </div>
            </div>
          ) : (
            ""
          )}
          <div className="row">
            <div className="col-sm-12">
              {!this.state.displayLegacyFlatView
                ? this.renderGroupedOptions(
                    OPTIONS_GROUPS,
                    this.filterOptionsBySearch(options),
                  )
                : this.renderLegacyFlatView(
                    this.filterOptionsBySearch(options),
                  )}
            </div>
          </div>
        </FormDialog>
      </div>
    );
  }
}

export default EditPresetDialog;
