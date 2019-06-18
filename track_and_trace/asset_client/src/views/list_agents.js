/**
 * Copyright 2017 Intel Corporation
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
const agents = require('../services/agents')

const PAGE_SIZE = 50

const chipTray = (chips) => {
  return m('.chip-tray',
    typeof chips === 'object' ? chips.map((chip) => m('.chip', chip)) : m('span', chips))
}

const AgentList = {
  oninit (vnode) {
    vnode.state.agents = []
    vnode.state.filteredAgents = []
    vnode.state.currentPage = 0

    const refresh = () => {
      agents.getAgents()
        .then((agents) => {
          vnode.state.agents = sortBy(agents, 'org_id')
          vnode.state.filteredAgents = vnode.state.agents
        })
        .then(() => { vnode.state.refreshId = setTimeout(refresh, 10000) })
    }

    refresh()
  },

  onbeforeremove (vnode) {
    clearTimeout(vnode.state.refreshId)
  },

  view (vnode) {
    let publicKey = api.getPublicKey()
    return [
      m('.agent-list',
        m('.row.btn-row.mb-2', _controlButtons(vnode, publicKey)),
        m(Table, {
          headers: [
            'Key',
            'Organization',
            'Roles'
          ],
          rows: vnode.state.filteredAgents.slice(
              vnode.state.currentPage * PAGE_SIZE,
              (vnode.state.currentPage + 1) * PAGE_SIZE)
            .map((agent) => [
              m(`a[href=/agents/${agent.public_key}]`, { oncreate: m.route.link },
                truncate(agent.public_key, { length: 32 })),
              agent.org_id,
              chipTray(agent.roles)
            ]),
          noRowsText: 'No agents found'
        })
      )
    ]
  }
}

const _controlButtons = (vnode, publicKey) => {
  if (publicKey) {
    let filterAgents = (f) => {
      vnode.state.filteredAgents = vnode.state.agents.filter(f)
    }

    return [
      m('.col-sm-8',
        m(FilterGroup, {
          ariaLabel: 'Filter Based on Ownership',
          filters: {
            'All': () => { vnode.state.filteredAgents = vnode.state.agents },
          },
          initialFilter: 'All'
        })),
      m('.col-sm-4', _pagingButtons(vnode))
    ]
  } else {
    return [
      m('.col-sm-4.ml-auto', _pagingButtons(vnode))
    ]
  }
}

const _pagingButtons = (vnode) =>
  m(PagingButtons, {
    setPage: (page) => { vnode.state.currentPage = page },
    currentPage: vnode.state.currentPage,
    maxPage: Math.floor(vnode.state.filteredAgents.length / PAGE_SIZE)
  })

module.exports = AgentList
