import '../css/EditPresetDialog.scss';
import React from 'react';
import FormDialog from './FormDialog';
import ProcessingNodeOption from './ProcessingNodeOption';
import PresetUtils from '../classes/PresetUtils';
import PropTypes from 'prop-types';
import values from 'object.values';
import { _ } from '../classes/gettext';

if (!Object.values) {
    values.shim();
}

// Do not apply to WebODM, can cause confusion
const OPTS_BLACKLIST = ['build-overviews', 'orthophoto-no-tiled', 'orthophoto-compression', 'orthophoto-png', 'orthophoto-kmz', 'pc-copc', 'pc-las', 'pc-ply', 'pc-csv', 'pc-ept', 'cog', 'gltf'];

// Pipeline-ordered option groups with display metadata
const PIPELINE_GROUPS = [
    {
        id: 'input',
        name: _('Input & Preprocessing'),
        icon: 'fa-download',
        subgroups: [
            { id: 'camera', name: _('Camera Configuration') },
            { id: 'image-prep', name: _('Image Preprocessing') },
            { id: 'video', name: _('Video Input') }
        ]
    },
    {
        id: 'split-merge',
        name: _('Split/Merge (Large Datasets)'),
        icon: 'fa-sitemap',
        subgroups: [
            { id: 'splitting', name: _('Splitting') },
            { id: 'merging', name: _('Merging') }
        ]
    },
    {
        id: 'sfm',
        name: _('Sparese Reconstruction (SfM)'),
        icon: 'fa-share-alt',
        subgroups: [
            { id: 'feature-extraction', name: _('Feature Extraction') },
            { id: 'feature-matching', name: _('Feature Matching') },
            { id: 'sparse-reconstruction', name: _('Sparse Reconstruction') },
            { id: 'gps', name: _('GPS Priors') }
        ]
    },
    {
        id: 'mvs',
        name: _('Dense Reconstruction (MVS)'),
        icon: 'fa-cubes',
        subgroups: [
            { id: 'depthmap', name: _('Depth Map Generation') }
        ]
    },
    {
        id: 'pointcloud',
        name: _('Point Cloud Processing (PDAL)'),
        icon: 'fa-braille',
        subgroups: [
            { id: 'filtering', name: _('Filtering') },
            { id: 'postprocess', name: _('Post-Processing') }
        ]
    },
    {
        id: 'mesh',
        name: _('Meshing (Poisson)'),
        icon: 'fa-gem',
        subgroups: [
            { id: 'mesh-gen', name: _('Mesh Generation') }
        ]
    },
    {
        id: 'texturing',
        name: _('Texturing (MVS-Tex)'),
        icon: 'fa-image',
        subgroups: [
            { id: 'texture-opts', name: _('Texture Options') }
        ]
    },
    {
        id: 'outputbounds',
        name: _('Bounds & Cropping'),
        icon: 'fa-crop',
        subgroups: [
            { id: 'bounds', name: _('Boundary') }
        ]
    },
    {
        id: 'dem',
        name: _('Digital Elevation Models (SMRF/GDAL)'),
        icon: 'fa-mountain',
        subgroups: [
            { id: 'dem-output', name: _('Output Selection') },
            { id: 'dem-quality', name: _('Resolution & Quality') },
            { id: 'smrf', name: _('Ground Classification (SMRF)') }
        ]
    },
    {
        id: 'orthophoto',
        name: _('Orthophoto'),
        icon: 'fa-map',
        subgroups: [
            { id: 'ortho-opts', name: _('Orthophoto Options') }
        ]
    },
    {
        id: 'export',
        name: _('Export Formats'),
        icon: 'fa-file-export',
        subgroups: [
            { id: 'export-opts', name: _('Export Options') }
        ]
    },
    {
        id: 'system',
        name: _('System & Pipeline Control'),
        icon: 'fa-cogs',
        subgroups: [
            { id: 'performance', name: _('Performance') },
            { id: 'pipeline', name: _('Pipeline Control') }
        ]
    }
];

// Map each option to its group and subgroup
const OPTION_GROUP_MAP = {
    // Input & Preprocessing - Camera Configuration
    'camera-lens': { group: 'input', subgroup: 'camera' },
    'cameras': { group: 'input', subgroup: 'camera' },
    'use-exif': { group: 'input', subgroup: 'camera' },
    'use-fixed-camera-params': { group: 'input', subgroup: 'camera' },
    'rolling-shutter': { group: 'input', subgroup: 'camera' },
    'rolling-shutter-readout': { group: 'input', subgroup: 'camera' },
    
    // Input & Preprocessing - Image Preprocessing
    'bg-removal': { group: 'input', subgroup: 'image-prep' },
    'sky-removal': { group: 'input', subgroup: 'image-prep' },
    'primary-band': { group: 'input', subgroup: 'image-prep' },
    'radiometric-calibration': { group: 'input', subgroup: 'image-prep' },
    'skip-band-alignment': { group: 'input', subgroup: 'image-prep' },
    
    // Input & Preprocessing - Video Input
    'video-limit': { group: 'input', subgroup: 'video' },
    'video-resolution': { group: 'input', subgroup: 'video' },
    
    // Split/Merge - Splitting
    'split': { group: 'split-merge', subgroup: 'splitting' },
    'split-overlap': { group: 'split-merge', subgroup: 'splitting' },
    'sm-cluster': { group: 'split-merge', subgroup: 'splitting' },
    
    // Split/Merge - Merging
    'merge': { group: 'split-merge', subgroup: 'merging' },
    'merge-skip-blending': { group: 'split-merge', subgroup: 'merging' },
    'sm-no-align': { group: 'split-merge', subgroup: 'merging' },
    
    // Structure from Motion - Feature Extraction
    'feature-type': { group: 'sfm', subgroup: 'feature-extraction' },
    'feature-quality': { group: 'sfm', subgroup: 'feature-extraction' },
    'min-num-features': { group: 'sfm', subgroup: 'feature-extraction' },
    
    // Structure from Motion - Feature Matching
    'matcher-type': { group: 'sfm', subgroup: 'feature-matching' },
    'matcher-neighbors': { group: 'sfm', subgroup: 'feature-matching' },
    'matcher-order': { group: 'sfm', subgroup: 'feature-matching' },
    
    // Structure from Motion - Sparse Reconstruction
    'sfm-algorithm': { group: 'sfm', subgroup: 'sparse-reconstruction' },
    'sfm-no-partial': { group: 'sfm', subgroup: 'sparse-reconstruction' },
    'use-hybrid-bundle-adjustment': { group: 'sfm', subgroup: 'sparse-reconstruction' },
    'min-track-length': { group: 'sfm', subgroup: 'sparse-reconstruction' },
    
    // Structure from Motion - GPS Priors
    'force-gps': { group: 'sfm', subgroup: 'gps' },
    'gps-accuracy': { group: 'sfm', subgroup: 'gps' },
    'gps-z-offset': { group: 'sfm', subgroup: 'gps' },
    
    // Dense Reconstruction - Depth Map Generation
    'pc-quality': { group: 'mvs', subgroup: 'depthmap' },
    'ignore-gsd': { group: 'mvs', subgroup: 'depthmap' },
    'depthmap-min-consistent-views': { group: 'mvs', subgroup: 'depthmap' },
    
    // Point Cloud Processing - Filtering
    'pc-filter': { group: 'pointcloud', subgroup: 'filtering' },
    'pc-skip-geometric': { group: 'pointcloud', subgroup: 'filtering' },
    
    // Point Cloud Processing - Post-Processing
    'pc-classify': { group: 'pointcloud', subgroup: 'postprocess' },
    'pc-rectify': { group: 'pointcloud', subgroup: 'postprocess' },
    'pc-sample': { group: 'pointcloud', subgroup: 'postprocess' },
    
    // Meshing - Mesh Generation
    'use-3dmesh': { group: 'mesh', subgroup: 'mesh-gen' },
    'skip-3dmodel': { group: 'mesh', subgroup: 'mesh-gen' },
    'mesh-octree-depth': { group: 'mesh', subgroup: 'mesh-gen' },
    'mesh-size': { group: 'mesh', subgroup: 'mesh-gen' },
    
    // Texturing - Texture Options
    'texturing-single-material': { group: 'texturing', subgroup: 'texture-opts' },
    'texturing-keep-unseen-faces': { group: 'texturing', subgroup: 'texture-opts' },
    'texturing-skip-global-seam-leveling': { group: 'texturing', subgroup: 'texture-opts' },
    
    // Bounds & cropping - Boundary
    'auto-boundary': { group: 'outputbounds', subgroup: 'bounds' },
    'auto-boundary-distance': { group: 'outputbounds', subgroup: 'bounds' },
    'boundary': { group: 'outputbounds', subgroup: 'bounds' },
    'crop': { group: 'outputbounds', subgroup: 'bounds' },
    
    // Digital Elevation Models - Output Selection
    'dsm': { group: 'dem', subgroup: 'dem-output' },
    'dtm': { group: 'dem', subgroup: 'dem-output' },
    
    // Digital Elevation Models - Resolution & Quality
    'dem-resolution': { group: 'dem', subgroup: 'dem-quality' },
    'dem-decimation': { group: 'dem', subgroup: 'dem-quality' },
    'dem-gapfill-steps': { group: 'dem', subgroup: 'dem-quality' },
    'dem-euclidean-map': { group: 'dem', subgroup: 'dem-quality' },
    
    // Digital Elevation Models - Ground Classification (SMRF)
    'smrf-scalar': { group: 'dem', subgroup: 'smrf' },
    'smrf-slope': { group: 'dem', subgroup: 'smrf' },
    'smrf-threshold': { group: 'dem', subgroup: 'smrf' },
    'smrf-window': { group: 'dem', subgroup: 'smrf' },
    
    // Orthophoto - Orthophoto Options
    'orthophoto-resolution': { group: 'orthophoto', subgroup: 'ortho-opts' },
    'orthophoto-cutline': { group: 'orthophoto', subgroup: 'ortho-opts' },
    'fast-orthophoto': { group: 'orthophoto', subgroup: 'ortho-opts' },
    'skip-orthophoto': { group: 'orthophoto', subgroup: 'ortho-opts' },
    
    // Export Formats - Export Options
    '3d-tiles': { group: 'export', subgroup: 'export-opts' },
    'tiles': { group: 'export', subgroup: 'export-opts' },
    'skip-report': { group: 'export', subgroup: 'export-opts' },
    
    // System & Pipeline Control - Performance
    'max-concurrency': { group: 'system', subgroup: 'performance' },
    'no-gpu': { group: 'system', subgroup: 'performance' },
    'optimize-disk-space': { group: 'system', subgroup: 'performance' },
    
    // System & Pipeline Control - Pipeline Control
    'rerun-from': { group: 'system', subgroup: 'pipeline' },
    'end-with': { group: 'system', subgroup: 'pipeline' }
};

class EditPresetDialog extends React.Component {
    static defaultProps = {
    };

    static propTypes = {
        preset: PropTypes.object.isRequired,
        availableOptions: PropTypes.array.isRequired,
        saveAction: PropTypes.func.isRequired,
        deleteAction: PropTypes.func.isRequired,
        onHide: PropTypes.func
    };

    constructor(props){
        super(props);

        // Refs to ProcessingNodeOption components
        this.options = {};

        // Initialize collapsed state - all expanded by default
        const collapsedGroups = {};
        PIPELINE_GROUPS.forEach(g => {
            collapsedGroups[g.id] = false;
        });
        collapsedGroups['ungrouped'] = false;

        this.state = {
            name: props.preset.name,
            search: "",
            showSearch: false,
            collapsedGroups,
            viewMode: 'grouped' // 'grouped' or 'flat'
        };

        this.getFormData = this.getFormData.bind(this);
        this.onShow = this.onShow.bind(this);
        this.setOptionRef = this.setOptionRef.bind(this);
        this.getOptions = this.getOptions.bind(this);
        this.isCustomPreset = this.isCustomPreset.bind(this);
    }

    setOptionRef(optionName){
        return (component) => {
            if (component) this.options[optionName] = component;
        }
    }

    getOptions(){
        return Object.values(this.options)
          .map(option => {
            return {
              name: option.props.name,
              value: option.getValue()
            };
          })
          .filter(option => option.value !== undefined);
    }

    getFormData(){
      return {
        id: this.props.preset.id,
        name: this.state.name,
        options: this.getOptions()
      };
    }

    isCustomPreset(){
        return this.props.preset.id === -1;
    }

    onShow(){
      if (!this.isCustomPreset()) this.nameInput.focus();
    }

    handleChange(field){
      return (e) => {
        let state = {};
        state[field] = e.target.value;
        this.setState(state);
      }
    }

    toggleSearchControl = () => {
        this.setState({showSearch: !this.state.showSearch});
    }

    toggleGroup = (groupId) => {
        this.setState(prevState => ({
            collapsedGroups: {
                ...prevState.collapsedGroups,
                [groupId]: !prevState.collapsedGroups[groupId]
            }
        }));
    }

    expandAll = () => {
        const collapsedGroups = {};
        PIPELINE_GROUPS.forEach(g => collapsedGroups[g.id] = false);
        collapsedGroups['ungrouped'] = false;
        this.setState({ collapsedGroups });
    }

    collapseAll = () => {
        const collapsedGroups = {};
        PIPELINE_GROUPS.forEach(g => collapsedGroups[g.id] = true);
        collapsedGroups['ungrouped'] = true;
        this.setState({ collapsedGroups });
    }

    toggleViewMode = () => {
        this.setState(prevState => ({
            viewMode: prevState.viewMode === 'grouped' ? 'flat' : 'grouped'
        }));
    }

    componentDidUpdate(prevProps, prevState){
        if (this.state.showSearch && this.searchControl){
            this.searchControl.focus();
        }
    }

    // Build a lookup of option name -> option data
    buildOptionsLookup(options) {
        const lookup = {};
        options.forEach(opt => {
            lookup[opt.name] = opt;
        });
        return lookup;
    }

    // Check if option passes search filter
    passesSearchFilter(option) {
        if (!this.state.showSearch || this.state.search === "") return true;
        const searchLower = this.state.search.toLowerCase();
        return option.name.toLowerCase().indexOf(searchLower) !== -1 ||
               (option.help && option.help.toLowerCase().indexOf(searchLower) !== -1);
    }

    // Render a single option
    renderOption(option) {
        return (
            <ProcessingNodeOption 
                {...option}
                key={option.name}
                ref={this.setOptionRef(option.name)} 
            />
        );
    }

    // Render grouped view
    renderGroupedOptions(options) {
        const lookup = this.buildOptionsLookup(options);
        const assignedOptions = new Set();

        const groupElements = PIPELINE_GROUPS.map(group => {
            // Collect all options in this group's subgroups
            const groupOptions = [];
            
            group.subgroups.forEach(subgroup => {
                const subgroupOptions = Object.keys(OPTION_GROUP_MAP)
                    .filter(optName => {
                        const mapping = OPTION_GROUP_MAP[optName];
                        return mapping.group === group.id && mapping.subgroup === subgroup.id;
                    })
                    .filter(optName => lookup[optName])
                    .filter(optName => this.passesSearchFilter(lookup[optName]))
                    .map(optName => {
                        assignedOptions.add(optName);
                        return lookup[optName];
                    });
                
                if (subgroupOptions.length > 0) {
                    groupOptions.push({
                        subgroup,
                        options: subgroupOptions
                    });
                }
            });

            // Skip empty groups
            if (groupOptions.length === 0) return null;

            const isCollapsed = this.state.collapsedGroups[group.id];
            const totalOptions = groupOptions.reduce((sum, sg) => sum + sg.options.length, 0);

            return (
                <div key={group.id} className="option-group">
                    <div 
                        className="option-group-header" 
                        onClick={() => this.toggleGroup(group.id)}
                    >
                        <i className={`fa ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} toggle-icon`}></i>
                        <i className={`fa ${group.icon} group-icon`}></i>
                        <span className="group-name">{group.name}</span>
                        <span className="option-count">({totalOptions})</span>
                    </div>
                    
                    {!isCollapsed && (
                        <div className="option-group-content">
                            {groupOptions.map(({ subgroup, options: subgroupOpts }) => (
                                <div key={subgroup.id} className="option-subgroup">
                                    {group.subgroups.length > 1 && (
                                        <div className="option-subgroup-header">
                                            {subgroup.name}
                                        </div>
                                    )}
                                    <div className="option-subgroup-content">
                                        {subgroupOpts.map(opt => this.renderOption(opt))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }).filter(Boolean);

        // Collect any ungrouped options (new options not yet in OPTION_GROUP_MAP)
        const ungroupedOptions = options
            .filter(opt => !assignedOptions.has(opt.name))
            .filter(opt => this.passesSearchFilter(opt));

        if (ungroupedOptions.length > 0) {
            const isCollapsed = this.state.collapsedGroups['ungrouped'];
            groupElements.push(
                <div key="ungrouped" className="option-group">
                    <div 
                        className="option-group-header"
                        onClick={() => this.toggleGroup('ungrouped')}
                    >
                        <i className={`fa ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} toggle-icon`}></i>
                        <i className="fa fa-question-circle group-icon"></i>
                        <span className="group-name">{_('Other Options')}</span>
                        <span className="option-count">({ungroupedOptions.length})</span>
                    </div>
                    
                    {!isCollapsed && (
                        <div className="option-group-content">
                            <div className="option-subgroup-content">
                                {ungroupedOptions.map(opt => this.renderOption(opt))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return groupElements;
    }

    // Render flat view (original behavior)
    renderFlatOptions(options) {
        return options
            .filter(option => this.passesSearchFilter(option))
            .map(option => this.renderOption(option));
    }

    render(){
        let options = PresetUtils.getAvailableOptions(this.props.preset.options, this.props.availableOptions);
        
        // Filter blacklisted options
        options = options.filter(option => OPTS_BLACKLIST.indexOf(option.name.toLowerCase()) === -1);

        return (
            <div className="edit-preset-dialog">
                <FormDialog {...this.props}
                    getFormData={this.getFormData} 
                    reset={() => {}}
                    show={true}
                    onShow={this.onShow}
                    saveIcon="far fa-edit"
                    title={_("Edit Task Options")}
                    saveAction={this.props.saveAction}
                    deleteWarning={false}
                    deleteAction={(this.props.preset.id !== -1 && !this.props.preset.system) ? this.props.deleteAction : undefined}>
                  
                  {!this.isCustomPreset() ? 
                    [<div className="row preset-name" key="preset">
                        <label className="col-sm-2 control-label">{_("Name")}</label>
                        <div className="col-sm-10" style={{marginRight: "40px"}}>
                          <input type="text" className="form-control" ref={(domNode) => { this.nameInput = domNode; }} value={this.state.name} onChange={this.handleChange('name')} />
                        </div>
                    </div>,
                    <hr key="hr"/>]
                  : ""}

                  <div className="options-toolbar">
                      <button type="button" className="btn btn-default btn-sm" title={_("Search")} onClick={this.toggleSearchControl}>
                          <i className="fa fa-search"></i>
                      </button>
                      <button type="button" className="btn btn-default btn-sm" title={this.state.viewMode === 'grouped' ? _("Flat View") : _("Grouped View")} onClick={this.toggleViewMode}>
                          <i className={`fa ${this.state.viewMode === 'grouped' ? 'fa-list' : 'fa-layer-group'}`}></i>
                      </button>
                      {this.state.viewMode === 'grouped' && (
                          <React.Fragment>
                              <button type="button" className="btn btn-default btn-sm" title={_("Expand All")} onClick={this.expandAll}>
                                  <i className="fa fa-angle-double-down"></i>
                              </button>
                              <button type="button" className="btn btn-default btn-sm" title={_("Collapse All")} onClick={this.collapseAll}>
                                  <i className="fa fa-angle-double-up"></i>
                              </button>
                          </React.Fragment>
                      )}
                  </div>

                  {this.state.showSearch && (
                    <div className="row search-controls">
                        <div className="col-sm-12">
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder={_("Search options...")}
                                value={this.state.search} 
                                ref={(node) => { this.searchControl = node; }} 
                                onChange={this.handleChange('search')} 
                            />
                        </div>
                    </div>
                  )}

                  <div className="row options-container">
                    <div className="col-sm-12">
                        {this.state.viewMode === 'grouped' 
                            ? this.renderGroupedOptions(options)
                            : this.renderFlatOptions(options)
                        }
                    </div>
                  </div>
                </FormDialog>
            </div>
        );
    }
}

export default EditPresetDialog;
