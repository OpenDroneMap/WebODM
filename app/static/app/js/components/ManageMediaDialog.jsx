import React from 'react';
import $ from 'jquery';
import '../css/ManageMediaDialog.scss';
import PropTypes from 'prop-types';
import ErrorMessage from './ErrorMessage';
import Dropzone from '../vendor/dropzone';
import csrf from '../django/csrf';
import UploadProgressBar from './UploadProgressBar';
import Utils from '../classes/Utils';
import MediaView from './MediaView';
import { _, interpolate } from '../classes/gettext';

const MAX_FILE_SIZE = 128 * 1024 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.mp4,.mov,.avi,.mkv,.webm,.srt';

class ManageMediaDialog extends React.Component {
  static defaultProps = {
    task: null,
    projectId: -1,
    canEdit: false,
  };

  static propTypes = {
    task: PropTypes.object.isRequired,
    projectId: PropTypes.number.isRequired,
    canEdit: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      error: '',
      media: [],
      loading: true,
      uploading: false,
      progress: 0,
      files: [],
      totalCount: 0,
      uploadedCount: 0,
      totalBytes: 0,
      totalBytesSent: 0,
      lastUpdated: 0,
      editingDescription: null,
      descriptionValue: '',
      savingDescription: false,
      deletingFiles: new Set(),
      viewMode: 'grid'
    };
  }

  resetUploadState = () => {
    this.setState({
      error: "",
      uploading: false,
      progress: 0,
      files: [],
      totalCount: 0,
      uploadedCount: 0,
      totalBytes: 0,
      totalBytesSent: 0,
      lastUpdated: 0
    });
  }

  componentDidMount() {
    this._mounted = true;
    $(this.modal).modal('show');
    $(this.modal).on('hidden.bs.modal', () => {
      if (this._mounted) this.props.onClose();
    });

    this.fetchMedia();

    if (this.props.canEdit && this.dropzone) {
      Dropzone.autoDiscover = false;
      this.dz = new Dropzone(this.dropzone, {
        paramName: 'file',
        url: this.uploadUrl(),
        parallelUploads: 1,
        maxFilesize: MAX_FILE_SIZE / 1024 / 1024,
        uploadMultiple: false,
        acceptedFiles: ACCEPTED_EXTENSIONS,
        autoProcessQueue: true,
        createImageThumbnails: false,
        previewTemplate: '<div style="display:none"></div>',
        clickable: this.uploadBtn,
        timeout: 2147483647,
        chunking: true,
        chunkSize: 8000000,
        retryChunks: true,
        retryChunksLimit: 20,
        headers: {
          [csrf.header]: csrf.token,
        },
      });

      this.dz.on("addedfiles", files => {
          this.resetUploadState();
          let totalBytes = 0;

          for (let i = 0; i < files.length; i++){
              totalBytes += files[i].size;
              files[i].deltaBytesSent = 0;
              files[i].trackedBytesSent = 0;
              files[i].retries = 0;
          }

          this.setState({
            totalCount: this.state.totalCount + files.length,
            files,
            totalBytes: this.state.totalBytes + totalBytes
          });
        })
        .on("sending", () => {
          this.setState({uploading: true});
        })
        .on("uploadprogress", (file, progress, bytesSent) => {
            const now = new Date().getTime();

            if (bytesSent > file.size) bytesSent = file.size;
            
            if (progress === 100 || now - this.state.lastUpdated > 500){
                const deltaBytesSent = bytesSent - file.deltaBytesSent;
                file.trackedBytesSent += deltaBytesSent;

                const totalBytesSent = this.state.totalBytesSent + deltaBytesSent;
                const progress = totalBytesSent / this.state.totalBytes * 100;

                this.setState({
                    progress,
                    totalBytesSent,
                    lastUpdated: now
                });

                file.deltaBytesSent = bytesSent;
            }
        })
        .on("complete", (file) => {
            // Retry
            const retry = () => {
                const MAX_RETRIES = 20;

                if (!file.accepted){
                  throw new Error(interpolate(_('%(filename)s is not a valid file'), {filename: file.name }));
                }

                if (file.retries < MAX_RETRIES){
                    // Update progress
                    const totalBytesSent = this.state.totalBytesSent - file.trackedBytesSent;
                    const progress = totalBytesSent / this.state.totalBytes * 100;
        
                    this.setUploadState({
                        progress,
                        totalBytesSent,
                    });
        
                    file.status = Dropzone.QUEUED;
                    file.deltaBytesSent = 0;
                    file.trackedBytesSent = 0;
                    file.retries++;
                    setTimeout(() => {
                      this.dz.processQueue();
                    }, 5000 * file.retries);
                }else{
                    throw new Error(interpolate(_('Cannot upload %(filename)s, exceeded max retries (%(max_retries)s)'), {filename: file.name, max_retries: MAX_RETRIES}));
                }
            };

            try{
                if (file.status === "error"){
                    if ((file.size / 1024 / 1024) > this.dz.options.maxFilesize) {
                        // Delete from upload queue
                        this.setState({
                            totalCount: this.state.totalCount - 1,
                            totalBytes: this.state.totalBytes - file.size
                        });
                        throw new Error(interpolate(_('Cannot upload %(filename)s, file is too large! Default MaxFileSize is %(maxFileSize)s MB!'), { filename: file.name, maxFileSize: this.dz.options.maxFilesize }));
                    }
                    retry();
                }else{

                    // Check response
                    let response = JSON.parse(file.xhr.response);
                    if (response.success && response.added) {
                      this.setState(prevState => {
                        const existing = new Map(prevState.media.map(e => [e.filename, e]));
                        response.added.forEach(e => existing.set(e.filename, e));
                        return { media: Array.from(existing.values()) };
                      });
                    }

                    if (response.success){
                      if (response.uploaded && response.uploaded[file.upload.filename] === file.size){
                        // Update progress by removing the tracked progress and 
                        // use the file size as the true number of bytes
                        let totalBytesSent = this.state.totalBytesSent + file.size;
                        if (file.trackedBytesSent) totalBytesSent -= file.trackedBytesSent;
        
                        const progress = totalBytesSent / this.state.totalBytes * 100;
        
                        this.setState({
                            progress,
                            totalBytesSent,
                            uploadedCount: this.state.uploadedCount + 1
                        });
                      }else{
                        // Chunk success, wait for end
                      }

                      this.dz.processQueue();
                    }else{
                        retry();
                    }
                }
            }catch(e){
                if (this.manuallyCanceled){
                  // Manually canceled, ignore error
                  this.setState({uploading: false});
                }else{
                  this.setState({error: `${e.message}`, uploading: false});
                }

                if (this.dz.files.length) this.dz.cancelUpload();
            }
        })
        .on("queuecomplete", () => {
          const remainingFilesCount = this.state.totalCount - this.state.uploadedCount;
          if (remainingFilesCount === 0 && this.state.uploadedCount > 0){
            this.setState({uploading: false});
            this.resetUploadState();
          }
        })
        .on("reset", () => {
          this.resetUploadState();
        })
        .on('error', () => {
          if (this.state.uploading && !this.manuallyCanceled){
            this.setState({ error: _('Upload failed. Check your connection and try again.') });
          }
        });
    }
  }

  componentWillUnmount() {
    this._mounted = false;
    if (this.dz) {
      this.dz.destroy();
      this.dz = null;
    }
    $(this.modal).off('hidden.bs.modal').modal('hide');
  }

  fetchMedia() {
    $.getJSON(this.mediaUrl())
      .done((media) => {
        if (this._mounted) this.setState({ media, loading: false });
      })
      .fail(() => {
        if (this._mounted) this.setState({ error: _('Cannot load media.'), loading: false });
      });
  }

  uploadUrl() {
    return `/api/projects/${this.props.projectId}/tasks/${this.props.task.id}/media/upload`;
  }

  mediaUrl() {
    return `/api/projects/${this.props.projectId}/tasks/${this.props.task.id}/media/`;
  }

  downloadUrl(filename) {
    return `/api/projects/${this.props.projectId}/tasks/${this.props.task.id}/media/download/${encodeURIComponent(filename)}`;
  }

  handleDelete = (filename) => {
    if (!window.confirm(interpolate(_('Are you sure you want to delete %(filename)s ?'), { filename }))) return;

    this.setState(prevState => {
      const s = new Set(prevState.deletingFiles);
      s.add(filename);
      return { deletingFiles: s };
    });

    const doneDeleting = () => {
      this.setState(prevState => {
        const s = new Set(prevState.deletingFiles);
        s.delete(filename);
        return { deletingFiles: s };
      });
    };

    $.ajax({
      url: `/api/projects/${this.props.projectId}/tasks/${this.props.task.id}/media/manage/${encodeURIComponent(filename)}`,
      type: 'DELETE',
      dataType: 'json',
    })
      .done((resp) => {
        if (resp.success) {
          this.setState(prevState => ({
            media: prevState.media.filter(e => e.filename !== filename)
          }));
        }
        doneDeleting();
      })
      .fail(() => {
        this.setState({ error: _('Cannot delete file.') });
        doneDeleting();
      });
  };

  startEditDescription = (entry) => {
    this.setState({ editingDescription: entry.filename, descriptionValue: entry.description || '' });
  };

  cancelEditDescription = () => {
    this.setState({ editingDescription: null, descriptionValue: '' });
  };

  saveDescription = (filename) => {
    this.setState({ savingDescription: true });

    $.ajax({
      url: `/api/projects/${this.props.projectId}/tasks/${this.props.task.id}/media/manage/${encodeURIComponent(filename)}`,
      type: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({ description: this.state.descriptionValue }),
      dataType: 'json',
    })
      .done((resp) => {
        if (resp.success) {
          this.setState(prevState => ({
            media: prevState.media.map(e =>
              e.filename === filename ? {...e, description: this.state.descriptionValue} : e
            ),
            editingDescription: null,
            descriptionValue: '',
            savingDescription: false
          }));
        } else {
          this.setState({ savingDescription: false });
        }
      })
      .fail(() => {
        this.setState({ error: _('Cannot update description.'), savingDescription: false });
      });
  };

  handleClose = () => {
    $(this.modal).modal('hide');
  };

  typeIcon(type) {
    if (type === 'video') return 'fa fa-video';
    if (type === 'pano') return 'fa fa-globe';
    return 'fa fa-camera';
  }

  typeLabel(type) {
    if (type === 'video') return _('Video');
    if (type === 'pano') return _('Panorama');
    return _('Photo');
  }

  cancelUpload = () => {
    this.dz.removeAllFiles(true);
  }

  handleCancel = () => {
    this.manuallyCanceled = true;
    this.cancelUpload();
    setTimeout(() => {
      this.manuallyCanceled = false;
    }, 500);
  }

  renderUploadArea() {
    const { canEdit } = this.props;
    const { uploading } = this.state;
    if (!canEdit) return null;

    return (
      <div ref={(el) => (this.dropzone = el)} className="media-upload-area">
        <button
          ref={(el) => (this.uploadBtn = el)}
          disabled={uploading}
          type="button"
          className="btn btn-primary"
        >
          <i className="glyphicon glyphicon-upload"></i> {_('Upload Files')}
        </button>
        <span className="upload-hint">{_('Georeferenced photos, panoramas and videos will be displayed on the map.')}</span>
        {uploading && (
          <div className="upload-progress-area">
            <UploadProgressBar
              progress={this.state.progress}
              totalBytes={this.state.totalBytes}
              totalBytesSent={this.state.totalBytesSent}
              totalCount={this.state.totalCount}
            />
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={this.handleCancel}
            >
              <i className="glyphicon glyphicon-remove-circle"></i> {_('Cancel')}
            </button>
          </div>
        )}
      </div>
    );
  }

  renderEmpty() {
    return (
      <div className="media-empty">
        <i className="far fa-images"></i>
        <p>{_('No media files.')}</p>
      </div>
    );
  }

  renderViewToggle() {
    const { viewMode } = this.state;
    return (
      <div className="view-toggle">
        <button
          className={'btn btn-xs' + (viewMode === 'grid' ? ' btn-primary' : ' btn-default')}
          onClick={() => this.setState({ viewMode: 'grid' })}
          title={_('Grid view')}
        >
          <i className="fa fa-th"></i>
        </button>
        <button
          className={'btn btn-xs' + (viewMode === 'list' ? ' btn-primary' : ' btn-default')}
          onClick={() => this.setState({ viewMode: 'list' })}
          title={_('List view')}
        >
          <i className="fa fa-list"></i>
        </button>
      </div>
    );
  }

  renderDescription(entry) {
    const { canEdit } = this.props;
    const { editingDescription, savingDescription } = this.state;

    if (editingDescription === entry.filename) {
      return (
        <div className="description-edit">
          <input
            type="text"
            className="form-control input-sm"
            value={this.state.descriptionValue}
            onChange={(e) => this.setState({ descriptionValue: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') this.saveDescription(entry.filename); }}
            maxLength={1024}
            autoFocus
            disabled={savingDescription}
          />
          <div>
            {savingDescription ? <i className="fa fa-circle-notch fa-spin description-spinner"></i>
            : [
              <button key="V" className="btn btn-xs btn-primary" onClick={() => this.saveDescription(entry.filename)} style={{ visibility: savingDescription ? 'hidden' : 'visible' }}>
                <i className="fa fa-check"></i>
              </button>,
              " ",
              <button key="X" className="btn btn-xs btn-default" onClick={this.cancelEditDescription} style={{ paddingRight: "7px", paddingLeft: "7px", visibility: savingDescription ? 'hidden' : 'visible' }}>
                <i className="fa fa-times"></i>
              </button>
            ]}
          </div>
        </div>
      );
    }
    return (
      <span className="description-display">
        {entry.description || ""}
        {canEdit && !savingDescription && (
          <a href="javascript:void(0)" className="edit-desc-link" onClick={() => this.startEditDescription(entry)} title={_('Edit')}>
            <i className={"fa " + (entry.description ? "fa-pencil-alt" : "fa-plus-circle")}></i>
          </a>
        )}
      </span>
    );
  }

  render() {
    const { media, viewMode, loading, deletingFiles } = this.state;
    const { canEdit } = this.props; 

    return (
      <div ref={(el) => (this.modal = el)} className="modal manage-media-dialog" tabIndex="-1" data-backdrop="static">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" onClick={this.handleClose}>
                <span>&times;</span>
              </button>
              <h4 className="modal-title">{_('Media')}</h4>
            </div>
            <div className="modal-body">
              <ErrorMessage bind={[this, 'error']} />
              {this.renderUploadArea()}
              {loading
                ? <div className="media-dialog-loading"><i className="fa fa-circle-notch fa-fw fa-spin"></i></div>
                : media.length === 0
                  ? this.renderEmpty()
                  : (
                    <div>
                      <div className="media-toolbar">
                        {this.renderViewToggle()}
                      </div>
                      
                      <div className="media-grid" style={{display: viewMode === "grid" ? "grid" : "none"}}>
                        {media.map((entry) => (
                          <div key={entry.filename} className={"media-card " + (deletingFiles.has(entry.filename) ? "deleting" : "")}>
                            <MediaView basePath={`/api/projects/${this.props.projectId}/tasks/${this.props.task.id}/media`} media={entry} />
                            <div className="card-details theme-secondary">
                              <div className="card-filename theme-secondary-complementary" title={entry.filename}>
                                {entry.filename + (entry.srt ? " + SRT" : "")}
                              </div>
                            </div>
                            {canEdit && (
                              <button
                                className="card-delete-btn btn btn-xs btn-danger"
                                onClick={() => this.handleDelete(entry.filename)}
                                title={_('Delete')}
                                disabled={deletingFiles.has(entry.filename)}
                              >
                                <i className={deletingFiles.has(entry.filename) ? "fa fa-circle-notch fa-spin" : "fa fa-trash"}></i>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {viewMode === "list" ? <table className="table table-striped media-table">
                        <thead>
                          <tr>
                            <th className="col-type"></th>
                            <th style={{ width: '25%' }}>{_('Filename')}</th>
                            <th style={{ width: '57%' }}>{_('Description')}</th>
                            <th style={{ width: '17%' }}>{_('Size')}</th>
                            {canEdit && <th></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {media.map((entry) => (
                            <tr key={entry.filename}>
                              <td>
                                <i className={this.typeIcon(entry.type)}></i>
                              </td>
                              <td>
                                <a href={this.downloadUrl(entry.filename)} download={entry.filename}>
                                  {entry.filename}
                                </a>
                              </td>
                              <td>{this.renderDescription(entry)}</td>
                              <td>{Utils.bytesToSize(entry.size)}</td>
                              {canEdit && (
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    className="btn btn-xs btn-danger"
                                    onClick={() => this.handleDelete(entry.filename)}
                                    title={_('Delete')}
                                    disabled={deletingFiles.has(entry.filename)}
                                  >
                                    <i className={deletingFiles.has(entry.filename) ? "fa fa-circle-notch fa-spin" : "fa fa-trash"}></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table> : ""}
                    </div>
                  )
              }
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" onClick={this.handleClose}>
                {_('Close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ManageMediaDialog;
