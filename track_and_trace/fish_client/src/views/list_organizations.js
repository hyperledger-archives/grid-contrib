/**
 * Copyright 2019 Bitwise IO, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */
'use strict'

const m = require('mithril')
const sortBy = require('lodash/sortBy')
const truncate = require('lodash/truncate')
const {Table, FilterGroup, PagingButtons} = require('../components/tables.js')
const api = require('../services/api')
const organizations = require('../services/organizations')

const PAGE_SIZE = 50

const OrganizationList = {
    oninit (vnode) {
        vnode.state.organizations = []
        vnode.state.filteredOrganizations = []
        vnode.state.currentPage = 0

        const refresh = () => {
            organizations.getOrganizations()
                .then((organizations) => {
                    vnode.state.organizations = sortBy(organizations, 'org_id')
                    vnode.state.filteredOrganizations = vnode.state.organizations
                })
                .then(() => { vnode.state.refreshId = setTimeout(refresh, 10000) })
        }

        refresh()
    },

    onbeforeremove (vnode) {
        clearTimeout(vnode.state.refreshId)
    },

    view (vnode) {
        return [
            m('.organization-list',
                m(Table, {
                    headers: [
                        'ID',
                        'Address',
                    ],
                    rows: vnode.state.filteredOrganizations.slice(
                            vnode.state.currentPage * PAGE_SIZE,
                            (vnode.state.currentPage + 1) * PAGE_SIZE)
                        .map((organization) => [
                            m(`a[href=/organizations/${organization.org_id}]`, { oncreate: m.route.link },
                                truncate(organization.org_id, { length: 32})),
                            organization.address
                        ]),
                    noRowsText: 'No organizations found'
                })
            )
        ]
    }
}

const _controlButtons = (vnode) => {
    return [
        m('.col-sm-8',
            m(FilterGroup, {
                ariaLabel: 'Filter',
                filters: {
                    'All': () => { vnode.state.filteredOrganizations = vnode.state.organizations },
                },
                initialFilter: 'All'
            })),
        m('.col-sm-4', _pagingButtons(vnode))
    ]
}

const _pagingButtons = (vnode) =>
    m(PagingButtons, {
        setPage: (page) => { vnode.state.currentPage = page },
        currentPage: vnode.state.currentPage,
        maxPage: Math.floor(vnode.state.filteredAgents.length / PAGE_SIZE)
    })

module.exports = OrganizationList
