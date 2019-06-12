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
const _ = require('lodash')

const api = require('../services/api')
const agents = require('../services/agents')
const auth = require('../services/auth')
const layout = require('../components/layout')
const forms = require('../components/forms')

// Returns a string of bullets
const bullets = count => _.fill(Array(count), '•').join('')

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

const toggledInfo = (isToggled, initialView, toggledView) => {
  return m('.field-info', isToggled ? toggledView : initialView)
}

const privateKeyField = state => {
  return labeledField(
    fieldHeader('Private Key',
      forms.clickIcon('eye', () => {
        if (state.toggled.privateKey) {
          state.toggled.privateKey = false
          return
        }
        return auth.getPrivateKey()
          .then(privateKey => {
            state.toggled.privateKey = privateKey
            m.redraw()
          })
      })),
    toggledInfo(
      state.toggled.privateKey,
      bullets(64),
      state.toggled.privateKey))
}

/**
 * Displays information for a particular Agent.
 * The information can be edited if the user themself.
 */
const AgentDetailPage = {
  oninit (vnode) {
    vnode.state.toggled = {}
    vnode.state.update = {}
    agents.fetchAgent(vnode.attrs.publicKey)
      .then(agent => {
        vnode.state.agent = agent
      })
  },

  view (vnode) {
    const publicKey = _.get(vnode.state, 'agent.public_key', '')
    const org = _.get(vnode.state, 'agent.org_id', '')
    const roles = _.get(vnode.state, 'agent.roles', '')

    const profileContent = [
      layout.row(privateKeyField(vnode.state)),
      layout.row(staticField('Organization', org)),
      layout.row(staticField('Roles', roles))
    ]

    return [
      m('.container',
        layout.row(staticField('Public Key', publicKey)),
        publicKey === api.getPublicKey() ? profileContent : null)
    ]
  }
}

module.exports = AgentDetailPage
