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
        const org_id = _.get(vnode.state, 'organization.org_id')
        const name = _.get(vnode.state, 'organization.name')
        const address = _.get(vnode.state, 'organization.address')

        const organizationContent = [
            layout.row(staticField('ID', org_id)),
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
