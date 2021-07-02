import React from 'react';
import PropTypes from 'prop-types';
import './SLCheckbox.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';
import { _, interpolate } from 'webodm/classes/gettext';
import $ from 'jquery';

export default class SLCheckbox extends React.Component{
    static defaultProps = {
        sharePopup: null
    };

    static propTypes = {
        sharePopup: PropTypes.object.isRequired
    };

    constructor(props){
        super(props);

        this.state = {
            error: '',
            loading: false,
            useShortLink: false,
        };
    }

    toggleShortLinks = (e) => {
        e.stopPropagation();
        if (!this.state.useShortLink && !this.state.loading){
            this.setState({loading: true});

            const task = this.props.sharePopup.props.task;
            const linksTarget = this.props.sharePopup.props.linksTarget;

            $.ajax({
                type: 'POST',
                url: `/api/plugins/shortlinks/task/${task.id}/shortlink`,
                contentType: 'application/json'
            }).done(res => {
                const shortId = res.shortId;
                const linksTargetChar = linksTarget === '3d' ? '3' : 'm';

                const relShareLink = `s${linksTargetChar}${shortId}`;

                if (shortId) this.props.sharePopup.setState({relShareLink});
                else this.setState({error: interpolate(_('Invalid response from server: %(error)s'), { error: JSON.stringify(res)})});
                
                this.setState({loading: false, useShortLink: !this.state.useShortLink});
            }).fail(error => {
                this.setState({error: interpolate(_('Invalid response from server: %(error)s'), { error }), loading: false});
            });
        }else{
            this.props.sharePopup.setState({relShareLink: this.props.sharePopup.getRelShareLink()});
            this.setState({useShortLink: !this.state.useShortLink});
        }
    }

    render(){
        const { error, loading, useShortLink } = this.state;

        if (error) return (<ErrorMessage bind={[this, "error"]} />);

        return (<label className="slcheckbox" >
            <input 
              type="checkbox"
              disabled={loading}
              checked={useShortLink}
              onChange={this.toggleShortLinks}
               /> {_("Short Link")}
          </label>);
    }
}
