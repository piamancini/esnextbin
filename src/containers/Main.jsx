import React from 'react';
import ReactDOM from 'react-dom';
import Mousetrap from 'mousetrap';
import Progress from 'react-progress-2';
// import * as Babel from 'babel-standalone';
// import querystring from 'querystring';

import BundleHOC from './BundleHOC';

import Header from '../components/Header';
import Editors from '../components/Editors';
import Sandbox from '../components/Sandbox';

import * as Defaults from '../utils/DefaultsUtil';
import * as StorageUtils from '../utils/StorageUtils';
import * as GistAPIUtils from '../utils/GistAPIUtils';

class Main extends React.Component {
    constructor(props) {
        super();

        this.state = {
            activeEditor: 'code',
            shareModal: false,
            autorunIsOn: false
        };

        // const { hocEvents } = props;
        // hocEvents.on('gist:request:finished', (err, gistSession) => {
        //     console.log(err, gistSession);
        // });
    }

    componentDidMount() {
        const gistId = this.props.query.gist;

        if (!gistId) {
            this.checkPreviousSession();
        }

        this.bindKeyShortcuts();
    }

    checkPreviousSession() {
        const session = StorageUtils.getSession();

        if (session.autorun) {
            this.setState({autorunIsOn: session.autorun});
        }
    }

    bindKeyShortcuts() {
        const mousetrap = Mousetrap(ReactDOM.findDOMNode(this));

        mousetrap.bind(['command+e', 'ctrl+e'], (e) => {
            e.preventDefault();
            this.props.makeBundle();
        });

        mousetrap.bind(['command+s', 'ctrl+s'], (e) => {
            e.preventDefault();
            this.saveGist('public');
        });
    }

    changeEditor(activeEditor) {
        this.setState({ activeEditor });
    }

    saveGist(status) {
        Progress.show();
        this.props.setGistStatus(status);
        this.props.makeBundle();
    }

    openShareModal() {
        this.setState({shareModal: true});
    }

    closeShareModal() {
        this.setState({shareModal: false});
    }

    resetEditors() {
        GistAPIUtils.unauthorize();
        StorageUtils.cleanSession();
        window.location.reload();
    }

    toggleAutorun() {
        const autorunIsOn = !this.state.autorunIsOn;

        StorageUtils.saveToSession('autorun', autorunIsOn);
        this.setState({ autorunIsOn });
    }

    autorunOnChange() {
        if (this.autorunDelay) {
            clearTimeout(this.autorunDelay);
        }

        this.autorunDelay = setTimeout(() => {
            this.props.makeBundle();
        }, 1000);
    }

    render() {
        const { activeEditor, autorunIsOn } = this.state;
        const {
            // data
            bundle,
            bundling,
            editorsData,

            // methods
            onCodeChange,
            onHTMLChange,
            onPackageChange,
            makeBundle,
            updateDependencies,
            onStartBundle,
            onErrorBundle,
            onEndBundle
        } = this.props;

        return (
            <div className="main">
                <Progress.Component />

                <Header
                    height={Defaults.HEADER_HEIGHT}
                    activeEditor={activeEditor}
                    isBundling={bundling}
                    autorunIsOn={autorunIsOn}
                    onRunClick={makeBundle}
                    onShareClick={::this.openShareModal}
                    onEditorClick={::this.changeEditor}
                    onSaveGistClick={::this.saveGist}
                    onResetEditors={::this.resetEditors}
                    onToggleAutorun={::this.toggleAutorun}
                />

                <div className="content" tabIndex="-1">
                    <Editors
                        active={activeEditor}
                        code={editorsData.code}
                        html={editorsData.html}
                        json={editorsData.json}
                        error={editorsData.error}
                        headerHeight={Defaults.HEADER_HEIGHT}
                        onCodeChange={onCodeChange}
                        onHTMLChange={onHTMLChange}
                        onPackageChange={onPackageChange}
                    />

                    <Sandbox
                        bundle={bundle}
                        onModules={updateDependencies}
                        onStartBundle={onStartBundle}
                        onErrorBundle={onErrorBundle}
                        onEndBundle={onEndBundle}
                    />
                </div>
            </div>
        );
    }
}

export default BundleHOC(Main);
