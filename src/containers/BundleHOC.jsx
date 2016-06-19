import React from 'react';
import Progress from 'react-progress-2';
import * as Babel from 'babel-standalone';
import querystring from 'querystring';
import EventEmmiter from 'events';

import * as Defaults from '../utils/DefaultsUtil';
import * as StorageUtils from '../utils/StorageUtils';
import * as GistAPIUtils from '../utils/GistAPIUtils';

const BundleHOC = (ComposedComponent) => class extends React.Component {
    constructor() {
        super();

        this.state = {
            query: this._parseQuery(),
            bundle: {},
            bundling: false,
            editorsData: {
                code: Defaults.CODE,
                transpiledCode: this._transpileCode(Defaults.CODE),
                html: Defaults.HTML,
                json: Defaults.PACKAGE_JSON,
                error: void 0
            }
        };

        this.events = new EventEmmiter();
    }

    componentDidMount() {
        const gistId = this.state.query.gist;

        if (gistId) {
            this.getSavedBundle(gistId);
        } else {
            this.getSessionBundle();
        }
    }

    getSavedBundle(gistId) {
        const { query } = this.state;
        const sha = query.rev || query.sha;

        StorageUtils.turnOffSession();
        Progress.show();
        GistAPIUtils.getGist({id: gistId, sha}, (err, gistSession) => {
            Progress.hide();

            if (err) {
                console.log(err); // show special error on page
                return;
            }

            const { transpiledCode, error } = this._transpileCodeAndCatch(gistSession.code);
            this._updateEditorsData(Object.assign(gistSession, { transpiledCode, error }));

            if (query.execute || query.exec) {
                setTimeout(() => this.makeBundle(), 0);
            }
        });
    }

    getSessionBundle() {
        const session = StorageUtils.getSession();

        if (session) {
            const { code, html, json } = session;
            const { transpiledCode, error } = this._transpileCodeAndCatch(code);
            this._updateEditorsData({ code, html, json, transpiledCode, error });
        }
    }

    onCodeChange(code) {
        StorageUtils.saveToSession('code', code);

        clearTimeout(this.errorDelay);

        const { transpiledCode, error } = this._transpileCodeAndCatch(code);
        if (error) {
            this.errorDelay = setTimeout(() => {
                this._updateEditorsData({ error });
            }, 1000);
        }

        this._updateEditorsData({ code, transpiledCode, error: '' });

        // if (this.state.autorunIsOn) {
        //     this.autorunOnChange();
        // }
    }

    onHTMLChange(html) {
        StorageUtils.saveToSession('html', html);
        this._updateEditorsData({html, error: ''});
    }

    onPackageChange(json) {
        StorageUtils.saveToSession('json', json);
        this._updateEditorsData({json, error: ''});
    }

    setGistStatus(status) {
        // talk with gist API on endBundle event of sandbox
        this.gistStatus = status;
    }

    makeBundle() {
        if (this.state.bundling) return;

        const bundle = this._getBundle();
        if (bundle) {
            this.setState({ bundle });
        }
    }

    updateDependencies(modules) {
        const { bundle } = this.state;
        const updatedPackage = Object.assign({}, bundle.package, {
            dependencies: modules.reduce((memo, mod) => {
                memo[mod.name] = mod.version;
                return memo;
            }, {})
        });

        this._updateEditorsData({json: JSON.stringify(updatedPackage, null, 2)});
    }

    onStartBundle() {
        if (this.state.bundling) return;

        this.progressDelay = setTimeout(() => {
            this.setState({bundling: true});
            Progress.show();
        }, 100);
    }

    onErrorBundle(err) {
        console.log(err); // maybe show some popup or notification here?
        this._finishBundling();
    }

    onEndBundle() {
        clearTimeout(this.progressDelay);

        if (this.gistStatus) {
            const gistId = this.query.gist;
            const { editorsData } = this.state;
            const cb = (err, res, isFork) => {
                // Progress.hideAll();
                if (err) {
                    console.log(err); // show special error on page
                    return;
                }

                if (!gistId || isFork) {
                    window.location.search = `gist=${res.body.id}`;
                }

                this._finishBundling();
            };

            this.setGistStatus();

            if (gistId) {
                GistAPIUtils.updateGist(gistId, editorsData, this.gistStatus, cb);
            } else {
                GistAPIUtils.createGist(editorsData, this.gistStatus, cb);
            }
        } else {
            this._finishBundling();
        }
    }

    render() {
        return (
            <ComposedComponent
                {...this.props}

                // data
                query={this.state.query}
                bundle={this.state.bundle}
                bundling={this.state.bundling}
                editorsData={this.state.editorsData}
                hocEvents={this.events}

                // methods
                onCodeChange={::this.onCodeChange}
                onHTMLChange={::this.onHTMLChange}
                onPackageChange={::this.onPackageChange}
                makeBundle={::this.makeBundle}
                updateDependencies={::this.updateDependencies}
                onStartBundle={::this.onStartBundle}
                onErrorBundle={::this.onErrorBundle}
                onEndBundle={::this.onEndBundle}
            />
        );
    }

    _finishBundling() {
        Progress.hideAll();
        this.setState({bundling: false});
    }

    _updateEditorsData(newData) {
        const editorsData = Object.assign({}, this.state.editorsData, newData);
        this.setState({ editorsData });
    }

    _parseQuery() {
        return querystring.parse(window.location.search.slice(1));
    }

    _getBundle() {
        let { editorsData } = this.state;

        let json;
        try {
            json = JSON.parse(editorsData.json);
        } catch (error) {
            this._updateEditorsData({ error });
            return;
        }

        return {
            code: editorsData.transpiledCode,
            raw: editorsData.code,
            html: editorsData.html,
            package: json
        };
    }

    _transpileCode(code) {
        return Babel.transform(code, Defaults.BABEL_OPTIONS).code;
    }

    _transpileCodeAndCatch(code) {
        let transpiledCode;
        let error;

        if (code) {
            try {
                transpiledCode = this._transpileCode(code);
            } catch (err) {
                if (err._babel) {
                    transpiledCode = `/*
${err.message || 'Error while transpilation'}
*/`;
                    error = err;
                }
            }
        }
        return { transpiledCode, error };
    }
};

export default BundleHOC;
