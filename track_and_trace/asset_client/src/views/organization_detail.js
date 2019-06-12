'use strict'

const m = require('mithril')
const _ = require('lodash')

const organizations = require('../services/organizations')
const layout = require('../components/layout')

// Basis for info fields with headers
const labeledField = (header, field) => {
  return m('.field-group.mt-5', header, field)
}

const fieldHeader = (label, ...additions) => {
  return m('.field-header', [
    m('span.h5.mr-3', label),
    additions
  ])
}

// Simple info field with a label
const staticField = (label, info) => labeledField(fieldHeader(label), info)

const OrganizationDetailPage = {
  oninit (vnode) {
    organizations.fetchOrganization(vnode.attrs.orgId)
      .then(organization => {
        vnode.state.organization = organization
      })
  },

  view (vnode) {
    const orgId = _.get(vnode.state, 'organization.org_id')
    const name = _.get(vnode.state, 'organization.name')
    const address = _.get(vnode.state, 'organization.address')

    const organizationContent = [
      layout.row(staticField('ID', orgId)),
      layout.row(staticField('Name', name)),
      layout.row(staticField('Address', address))
    ]

    return [
      m('.container',
        organizationContent)
    ]
  }
}

module.exports = OrganizationDetailPage
