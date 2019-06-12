'use strict'

const m = require('mithril')
const sortBy = require('lodash/sortBy')
const truncate = require('lodash/truncate')
const { Table } = require('../components/tables.js')
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
            'Address'
          ],
          rows: vnode.state.filteredOrganizations.slice(
            vnode.state.currentPage * PAGE_SIZE,
            (vnode.state.currentPage + 1) * PAGE_SIZE)
            .map((organization) => [
              m(`a[href=/organizations/${organization.org_id}]`, { oncreate: m.route.link },
                truncate(organization.org_id, { length: 32 })),
              organization.address
            ]),
          noRowsText: 'No organizations found'
        })
      )
    ]
  }
}

module.exports = OrganizationList
