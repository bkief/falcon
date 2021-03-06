import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {contains} from 'ramda';
import ReactDataGrid from 'react-data-grid';
import ms from 'ms';
import matchSorter from 'match-sorter';
import cronstrue from 'cronstrue';

import CreateModal from './create-modal.jsx';
import PreviewModal from './preview-modal.jsx';
import PromptLoginModal from './login-modal.jsx';
import {Row, Column} from '../../layout.jsx';
import SQL from './sql.jsx';

import {SQL_DIALECTS_USING_EDITOR} from '../../../constants/constants';

import './scheduler.css';

const NO_OP = () => {};

const ROW_HEIGHT = 84;

class QueryFormatter extends React.Component {
    static propTypes = {
        /*
         * Object passed by `react-data-grid` to each row. Here the value
         * is an object containg the required `query` string.
         */
        value: PropTypes.shape({
            query: PropTypes.string.isRequired
        })
    };

    render() {
        const query = this.props.value;
        return (
            <Row>
                <Column
                    className="ellipsis"
                    style={{maxHeight: ROW_HEIGHT, padding: 8, paddingRight: '24px', fontSize: 15}}
                >
                    {query.name ? (
                        <span className="ellipsis" style={{fontSize: 16}}>
                            {query.name}
                        </span>
                    ) : (
                        <SQL>{query.query}</SQL>
                    )}
                </Column>
            </Row>
        );
    }
}

class IntervalFormatter extends React.Component {
    static propTypes = {
        /*
         * Object passed by `react-data-grid` to each row. Here the value
         * is an object containg the required `refreshInterval`.
         */
        value: PropTypes.shape({
            refreshInterval: PropTypes.number.isRequired,
            cronInterval: PropTypes.string
        })
    };

    render() {
        const run = this.props.value;

        return (
            <em
                className="ellipsis"
                style={{
                    display: 'block',
                    fontSize: 15
                }}
            >
                {run.cronInterval
                    ? cronstrue.toString(run.cronInterval)
                    : `Runs every ${ms(run.refreshInterval * 1000, {
                          long: true
                      })}`}
            </em>
        );
    }
}

function mapRows(rows) {
    return rows.map(r => ({
        query: r,
        run: r
    }));
}

class Scheduler extends Component {
    static defaultProps = {
        queries: [],
        refreshQueries: NO_OP,
        openLogin: NO_OP,
        createScheduledQuery: NO_OP,
        updateScheduledQuery: NO_OP,
        deleteScheduledQuery: NO_OP,
        openQueryPage: NO_OP
    };

    static propTypes = {
        queries: PropTypes.arrayOf(
            PropTypes.shape({
                query: PropTypes.string.isRequired,
                refreshInterval: PropTypes.number.isRequired,
                fid: PropTypes.string.isRequired
            }).isRequired
        ),
        initialCode: PropTypes.string,
        requestor: PropTypes.string,
        dialect: PropTypes.string,
        preview: PropTypes.object,
        refreshQueries: PropTypes.func.isRequired,
        openLogin: PropTypes.func.isRequired,
        createScheduledQuery: PropTypes.func.isRequired,
        updateScheduledQuery: PropTypes.func.isRequired,
        deleteScheduledQuery: PropTypes.func.isRequired,
        openQueryPage: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            search: '',
            selectedQuery: null,
            createModalOpen: Boolean(this.props.initialCode)
        };
        this.columns = [
            {
                key: 'query',
                name: 'Query',
                filterable: true,
                formatter: QueryFormatter
            },
            {
                key: 'run',
                name: 'Schedule',
                filterable: true,
                formatter: IntervalFormatter
            }
        ];

        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.getRows = this.getRows.bind(this);
        this.rowGetter = this.rowGetter.bind(this);
        this.openPreview = this.openPreview.bind(this);
        this.closePreview = this.closePreview.bind(this);
        this.openCreateModal = this.openCreateModal.bind(this);
        this.closeCreateModal = this.closeCreateModal.bind(this);
        this.createQuery = this.createQuery.bind(this);
        this.handleUpdate = this.handleUpdate.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
    }

    handleSearchChange(e) {
        this.setState({search: e.target.value});
    }

    getRows() {
        return mapRows(
            matchSorter(this.props.queries, this.state.search, {
                keys: ['query', 'name']
            })
        );
    }

    rowGetter(i) {
        return this.getRows()[i];
    }

    openPreview(i, query) {
        this.setState({selectedQuery: query.query});
    }

    closePreview() {
        this.setState({selectedQuery: null});
    }

    openCreateModal() {
        this.setState({createModalOpen: true});
    }

    closeCreateModal() {
        this.setState({createModalOpen: false});
    }

    createQuery(queryConfig) {
        if (!this.props.requestor) {
            return;
        }
        const newQueryParams = {
            ...queryConfig,
            requestor: this.props.requestor
        };
        return this.props.createScheduledQuery(newQueryParams).then(res => {
            if (res.error) {
                throw res.error;
            }
            return res;
        });
    }

    handleUpdate(queryConfig) {
        if (!this.props.requestor) {
            return;
        }
        const newQueryParams = {
            ...queryConfig,
            requestor: this.props.requestor
        };
        return this.props.updateScheduledQuery(newQueryParams).then(res => {
            if (res.error) {
                throw res.error;
            }
            return res;
        });
    }

    handleDelete(fid) {
        if (!this.props.requestor) {
            return;
        }
        this.props.deleteScheduledQuery(fid);
        this.closePreview();
    }

    render() {
        const rows = this.getRows();
        const loggedIn = Boolean(this.props.requestor);

        return (
            <React.Fragment>
                <Row
                    style={{
                        marginTop: 24,
                        marginBottom: 24,
                        justifyContent: 'space-between'
                    }}
                >
                    <input
                        value={this.state.search}
                        onChange={this.handleSearchChange}
                        placeholder="Search scheduled queries..."
                    />
                    {!contains(this.props.dialect, SQL_DIALECTS_USING_EDITOR) && (
                        <button style={{marginRight: '16px'}} onClick={this.openCreateModal}>
                            Create Scheduled Query
                        </button>
                    )}
                </Row>
                <Row
                    style={{
                        marginBottom: 16,
                        padding: '0 16px',
                        justifyContent: 'space-between'
                    }}
                >
                    <Column style={{width: 300}}>
                        <Row>
                            <Column style={{marginLeft: 8}}>
                                {rows.length} {rows.length === 1 ? ' query' : ' queries'}
                            </Column>
                        </Row>
                    </Column>
                    <Column style={{width: 300}}>
                        <Row>
                            <Column>
                                <button
                                    className="refresh-button"
                                    onClick={this.props.refreshQueries}
                                    style={{marginRight: '8px'}}
                                >
                                    ⟳
                                </button>
                            </Column>
                        </Row>
                    </Column>
                </Row>
                <Row className="scheduler-table" style={{margin: '0 16px 16px', width: 'auto'}}>
                    <ReactDataGrid
                        onRowClick={this.openPreview}
                        columns={this.columns}
                        rowGetter={this.rowGetter}
                        rowsCount={rows.length}
                        rowHeight={ROW_HEIGHT}
                        headerRowHeight={32}
                    />
                </Row>

                <CreateModal
                    initialCode={this.props.initialCode}
                    open={loggedIn && this.state.createModalOpen}
                    onClickAway={this.closeCreateModal}
                    onSubmit={this.createQuery}
                    dialect={this.props.dialect}
                    openQueryPage={this.props.openQueryPage}
                />
                <PromptLoginModal
                    open={!loggedIn && this.state.createModalOpen}
                    onClickAway={this.closeCreateModal}
                    onSubmit={this.props.openLogin}
                    preview={this.props.preview}
                />

                {/*
                  Preview modal is now only rendered if a `selectedQuery` has been
                  set. This simplifies the rerender logic.
                */}
                {this.state.selectedQuery && (
                    <PreviewModal
                        onClickAway={this.closePreview}
                        query={this.state.selectedQuery}
                        currentRequestor={this.props.requestor}
                        onLogin={this.props.openLogin}
                        onSave={this.handleUpdate}
                        onDelete={this.handleDelete}
                        dialect={this.props.dialect}
                        openQueryPage={this.props.openQueryPage}
                    />
                )}
            </React.Fragment>
        );
    }
}

export default Scheduler;
