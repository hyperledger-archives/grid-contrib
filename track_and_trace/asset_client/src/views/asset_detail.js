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
const moment = require('moment')
const truncate = require('lodash/truncate')

const {MultiSelect} = require('../components/forms')
const { Proposal, PropertyDefinition, AnswerProposalAction } = require('../protobuf')
const parsing = require('../services/parsing')
const api = require('../services/api')
const auth = require('../services/auth')
const records = require('../services/records')
const agents = require('../services/agents')
const {
  getPropertyValue,
  getLatestUpdateTime,
  getOldestPropertyUpdateTime,
  isReporter
} = require('../utils/records')

/**
 * Possible selection options
 */
const authorizableProperties = [
  'weight',
  'location'
]

const propertyNames = () => {
  return m.request({
    url: '/grid/schema/asset',
    method: 'GET'
  })
  .then(result => {
    return result.properties.map((property) => property.name)
  })
}

const _labelProperty = (label, value) => [
  m('dl',
    m('dt', label),
    m('dd', value))
]

const _row = (...cols) =>
  m('.row',
    cols
    .filter((col) => col !== null)
    .map((col) => m('.col', col)))

const TransferDropdown = {
  view (vnode) {
    // Default to no-op
    let onsuccess = vnode.attrs.onsuccess || (() => null)
    let record = vnode.attrs.record
    let role = vnode.attrs.role
    let publicKey = vnode.attrs.publicKey
    let signer = vnode.attrs.signer
    let properties = vnode.attrs.properties
    return [
      m('.dropdown',
        m('button.btn.btn-primary.btn-block.dropdown-toggle.text-left',
          { 'data-toggle': 'dropdown' },
          vnode.children),
        m('.dropdown-menu',
          (vnode.attrs.agents ?
            vnode.attrs.agents.map(agent => {
              let proposal = _getProposal(record, agent.public_key, role)
              return [
                m("a.dropdown-item[href='#']", {
                  onclick: (e) => {
                    e.preventDefault()
                    if (proposal && proposal.issuingAgent === publicKey) {
                      _answerProposal(record, agent.public_key, ROLE_TO_ENUM[role],
                                      Proposal.Role.CANCEL, 'asset', properties, signer)
                        .then(onsuccess)
                    } else {
                      _submitProposal(record, ROLE_TO_ENUM[role], agent.public_key, signer, properties)
                        .then(onsuccess)
                    }
                  }
                }, m('span.text-truncate',
                    truncate(agent.public_key, { length: 32 }),
                    (proposal ? ' \u2718' : '')))
              ]
            }) :
            null
          )))
    ]
  }
}

const ROLE_TO_ENUM = {
  'owner': Proposal.Role.OWNER,
  'custodian': Proposal.Role.CUSTODIAN,
  'reporter': Proposal.Role.REPORTER
}

const TransferControl = {
  view (vnode) {
    let {record, agents, publicKey, role, label, signer, properties} = vnode.attrs
    if (record.final) {
      return null
    }

    let onsuccess = vnode.attrs.onsuccess || (() => null)
    if (record[role] === publicKey) {
      return [
        m(TransferDropdown, {
          publicKey,
          agents,
          record,
          role,
          signer,
          properties,
          onsuccess
        }, `Transfer ${label}`)
      ]
    } else if (_hasProposal(record, publicKey, role) && _getProposal(record, publicKey, role).status === 'Open') {
      return [
        m('.d-flex.justify-content-start',
          m('button.btn.btn-primary', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM[role],
                              AnswerProposalAction.Response.ACCEPT, 'asset', properties, signer)

                .then(onsuccess)
            }
          },
          `Accept ${label}`),
          m('button.btn.btn-danger.ml-auto', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM[role],
                              AnswerProposalAction.Response.REJECT, 'asset', properties, signer)
                .then(onsuccess)
            }
          },
          `Reject`))
      ]
    } else {
      return null
    }
  }
}

const _getProposal = (record, receivingAgent, role) =>
  record.proposals.find(
    (proposal) => (proposal.role.toLowerCase() === role && proposal.receiving_agent === receivingAgent))

const _hasProposal = (record, receivingAgent, role) =>
  !!_getProposal(record, receivingAgent, role)

const ReporterControl = {
  view (vnode) {
    let {record, agents, publicKey, signer} = vnode.attrs
    if (record.final) {
      return null
    }

    let onsuccess = vnode.attrs.onsuccess || (() => null)

    if (record.owner === publicKey && !_hasProposal(record, publicKey, 'reporter')) {
      return [
        m(AuthorizeReporter, {
          record,
          agents,
          onsubmit: ([publicKey, properties]) =>
          _submitProposal(record, ROLE_TO_ENUM['reporter'], publicKey, signer, properties),
          onsuccess
        }),

        // Outstanding reporters
        Object.entries(_reporters(record))
        .filter(([key, _]) => key !== publicKey)
        .map(([key, properties]) => {
          return [
            m('.mt-2.d-flex.justify-content-start',
              `${truncate(key, {length: 24})} authorized for ${properties}`,
              '',
              m('.button.btn.btn-outline-danger.ml-auto', {
                onclick: (e) => {
                  e.preventDefault()
                  _revokeAuthorization(record, key, properties, signer)
                  onsuccess()
                }
              },
              'Revoke Authorization'))
          ]
        }),

        // Pending authorizations
        record.proposals.filter((p) => p.role === 'Reporter' && p.issuingAgent === publicKey).map(
          (p) =>
            m('.mt-2.d-flex.justify-content-start',
              `Pending proposal for ${p.receivingAgent} on ${p.properties}`,
              '',
              m('.button.btn.btn-outline-danger.ml-auto',
                {
                  onclick: (e) => {
                    e.preventDefault()
                    _answerProposal(record, p.receivingAgent, ROLE_TO_ENUM['reporter'],
                                    AnswerProposalAction.Response.CANCEL, 'asset', signer)
                    onsuccess()
                  }
                },
                'Rescind Proposal')))

      ]
    } else if (_hasProposal(record, publicKey, 'reporter') && _getProposal(record, publicKey, 'reporter').status === 'Open') {
      let proposal = _getProposal(record, publicKey, 'reporter')
      return [
        m('.d-flex.justify-content-start',
          m('button.btn.btn-primary', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM['reporter'],
                              AnswerProposalAction.Response.ACCEPT, 'asset', proposal.properties, signer)
              onsuccess()
            }
          },
          `Accept Reporting Authorization for ${proposal.properties}`),
          m('button.btn.btn-danger.ml-auto', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM['reporter'],
                              AnswerProposalAction.Response.REJECT, 'asset', proposal.properties, signer)
              onsuccess()
            }
          },
          `Reject`))
      ]
    } else {
      return null
    }
  }
}

/**
 * Returns a map of reporter key, to authorized fields
 */
const _reporters = (record) =>
  record.properties.reduce((acc, property) => {
    return property.reporters.reduce((acc, key) => {
      let props = (acc[key] || [])
      props.push(property.name)
      acc[key] = props
      return acc
    }, acc)
  }, {})

const _agentLink = (key) =>
  m(`a[href=/agents/${key}]`,
    { oncreate: m.route.link },
    truncate(key, {length: 24}))

const _propLink = (record, propName, content) =>
  m(`a[href=/assets/${record.record_id}/${propName}]`,
    { oncreate: m.route.link },
    content)

const ReportWeight = {
  view: (vnode) => {
    let onsuccess = vnode.attrs.onsuccess || (() => null)
    return [
      m('form', {
        onsubmit: (e) => {
          e.preventDefault()
          _updateProperty(vnode.attrs.record, {
              name: 'weight',
              dataType: PropertyDefinition.DataType.NUMBER,
              numberValue: parseFloat(vnode.state.weight) * 1000000
            },
            vnode.attrs.signer
          )
          .then(() => {
            vnode.state.weight = ''
          })
          .then(onsuccess)
        }
      },
      m('.form-row',
        m('.form-group.col-5',
          m('label.sr-only', { 'for': 'weight' }, 'Weight'),
          m('input.form-control[type="text"]', {
            name: 'weight',
            type: 'number',
            step: 'any',
            min: 0,
            onchange: m.withAttr('value', (value) => {
              vnode.state.weight = value
            }),
            value: vnode.state.weight,
            placeholder: 'Weight'
          })),
        m('.col-2',
          m('button.btn.btn-primary', 'Update'))))
    ]
  }
}

const ReportLocation = {
  view: (vnode) => {
    let onsuccess = vnode.attrs.onsuccess || (() => null)
    return [
      m('form', {
        onsubmit: (e) => {
          e.preventDefault()
          _updateProperty(vnode.attrs.record, {
              name: 'location',
              latLongValue: {
                latitude: parseFloat(vnode.state.latitude) * 1000000,
                longitude: parseFloat(vnode.state.longitude) * 1000000
              },
              dataType: PropertyDefinition.DataType.LAT_LONG
            },
            vnode.attrs.signer
          )
          .then(() => {
            vnode.state.latitude = ''
            vnode.state.longitude = ''
          })
          .then(onsuccess)
        }
      },
      m('.form-row',
        m('.form-group.col-5',
          m('label.sr-only', { 'for': 'latitude' }, 'Latitude'),
          m("input.form-control[type='text']", {
            name: 'latitude',
            type: 'number',
            step: 'any',
            min: -90,
            max: 90,
            onchange: m.withAttr('value', (value) => {
              vnode.state.latitude = value
            }),
            value: vnode.state.latitude,
            placeholder: 'Latitude'
          })),
        m('.form-group.col-5',
          m('label.sr-only', { 'for': 'longitude' }, 'Longitude'),
          m("input.form-control[type='text']", {
            name: 'longitude',
            type: 'number',
            step: 'any',
            min: -180,
            max: 180,
            onchange: m.withAttr('value', (value) => {
              vnode.state.longitude = value
            }),
            value: vnode.state.longitude,
            placeholder: 'Longitude'
          })),

        m('.col-2',
          m('button.btn.btn-primary', 'Update'))))
    ]
  }
}

const AuthorizeReporter = {
  oninit (vnode) {
    vnode.state.authorizedProperties = []
  },

  view (vnode) {
    return [
      _row(m('strong', 'Authorize Reporter')),
      m('.row',
        m('.col-6',
          m('input.form-control', {
            type: 'text',
            placeholder: 'Add reporter by public key...',
            value: vnode.state.reporter,
            oninput: m.withAttr('value', (value) => {
              // clear any previously matched values
              vnode.state.reporterKey = null
              vnode.state.reporter = value
              let reporter = vnode.attrs.agents.find(
                (agent) => agent.public_key === value)
              if (reporter) {
                vnode.state.reporterKey = reporter.public_key
              }
            })
          })),

        m('.col-4',
          m(MultiSelect, {
            label: 'Select Fields',
            color: 'primary',
            options: authorizableProperties.map(prop => [prop, prop]),
            selected: vnode.state.authorizedProperties,
            onchange: (selection) => {
              vnode.state.authorizedProperties = selection
            }
          })),

        m('.col-2',
          m('button.btn.btn-primary',
            {
              disabled: (!vnode.state.reporterKey || vnode.state.authorizedProperties.length === 0),
              onclick: (e) => {
                e.preventDefault()
                vnode.attrs.onsubmit([vnode.state.reporterKey, vnode.state.authorizedProperties])
                vnode.state.reporterKey = null
                vnode.state.reporter = null
                vnode.state.authorizedProperties = []
                vnode.attrs.onsuccess()
              }
            },
            'Authorize')))
    ]
  }
}

const AssetDetail = {
  oninit (vnode) {
    _loadData(vnode.attrs.recordId, vnode.state)
    vnode.state.refreshId = setInterval(() => {
      _loadData(vnode.attrs.recordId, vnode.state)
    }, 5000)
  },

  onbeforeremove (vnode) {
    clearInterval(vnode.state.refreshId)
  },

  view (vnode) {
    if (!vnode.state.record) {
      return m('.alert-warning', `Loading ${vnode.attrs.recordId}`)
    }

    let publicKey = api.getPublicKey()
    let owner = vnode.state.owner
    let custodian = vnode.state.custodian
    let record = vnode.state.record
    let signer = vnode.state.signer
    let properties = vnode.state.properties

    return [
      m('.asset-detail',
        m('h1.text-center', record.recordId),
        _row(
          _labelProperty('Serial Number', getPropertyValue(record, 'serialNumber'))),
        _row(
          _labelProperty('Created',
                         _formatTimestamp(getOldestPropertyUpdateTime(record))),
          _labelProperty('Updated',
                         _formatTimestamp(getLatestUpdateTime(record)))),

        _row(
          _labelProperty('Owner', (owner && owner.public_key ? _agentLink(owner.public_key) : '')),
          m(TransferControl, {
            publicKey,
            record,
            agents: vnode.state.agents,
            role: 'owner',
            label: 'Ownership',
            signer,
            properties,
            onsuccess: () => _loadData(vnode.attrs.recordId, vnode.state)
          })),

        _row(
          _labelProperty('Custodian', (custodian && custodian.public_key ? _agentLink(custodian.public_key) : '')),
          m(TransferControl, {
            publicKey,
            record,
            agents: vnode.state.agents,
            role: 'custodian',
            label: 'Custodianship',
            signer,
            properties,
            onsuccess: () => _loadData(vnode.attrs.recordId, vnode.state)
          })),

        _row(
          _labelProperty('Type', getPropertyValue(record, 'type'))),
        _row(
          _labelProperty('Weight', _formatWeight(getPropertyValue(record, 'weight'))),
          (isReporter(record, 'weight', publicKey) && !record.final
           ? m(ReportWeight, { record, onsuccess: () => _loadData(record.record_id, vnode.state), signer })
           : null)),

        _row(
          _labelProperty(
            'Location',
            _propLink(record, 'location', _formatLocation(getPropertyValue(record, 'location')))
          ),
          (isReporter(record, 'location', publicKey) && !record.final
           ? m(ReportLocation, { record, onsuccess: () => _loadData(record.record_id, vnode.state), signer })
           : null)),

        _row(m(ReporterControl, {
          record,
          publicKey,
          agents: vnode.state.allAgents,
          signer,
          onsuccess: () => _loadData(vnode.attrs.recordId, vnode.state)
        })),

        ((record.owner === publicKey && !record.final)
         ? m('.row.m-2',
             m('.col.text-center',
               m('button.btn.btn-danger', {
                 onclick: (e) => {
                   e.preventDefault()
                   _finalizeRecord(record, signer).then(() =>
                     _loadData(vnode.attrs.recordId, vnode.state))
                 }
               },
               'Finalize')))
         : '')
       )
    ]
  }
}

const _formatLocation = (location) => {
  if (location && location.latitude !== undefined && location.longitude !== undefined) {
    let latitude = parsing.toFloat(location.latitude)
    let longitude = parsing.toFloat(location.longitude)
    return `${latitude}, ${longitude}`
  } else {
    return 'Unknown'
  }
}

const _formatWeight = (weight) => `${weight / 1000000} kg`

const _formatTimestamp = (sec) => {
  if (!sec) {
    sec = Date.now() / 1000
  }
  return moment.unix(sec).format('YYYY-MM-DD')
}

const _loadData = (recordId, state) => {
  let publicKey = api.getPublicKey()
  return records.fetchRecord(recordId)
    .then(record => {
      state.record = record
    })
    .then(() => {
      agents.getAgents()
        .then((agents) => {
          state.allAgents = agents
          state.agents = agents.filter((agent) => agent.public_key !== publicKey)
          state.owner = agents.filter((agent) => agent.public_key === state.record.owner)[0]
          state.custodian = agents.filter((agent) => agent.public_key === state.record.custodian)[0]
        })
    })
    .then(() => {
      auth.getSigner()
        .then((signer) => {
          state.signer = signer
        })
    })
    .then(()=> {
      propertyNames()
      .then((res) => state.properties = res)
    })
}

const _submitProposal = (record, role, receivingAgent, signer, properties = authorizableProperties) => {
  return Promise.resolve(records.createProposal(
    record.record_id,
    receivingAgent,
    role,
    properties,
    "authorizing agent to modify weight and location",
    signer
  ))
}

const _answerProposal = (record, publicKey, role, response, schemaName, properties, signer) => {
  return Promise.resolve(records.answerProposal(
    response,
    record.record_id,
    publicKey,
    role,
    schemaName,
    properties,
    signer
  ))
}

const _updateProperty = (record, value, signer) => {
  return Promise.resolve(records.updateProperties(
    record.record_id,
    [value],
    signer
  ))
}

const _finalizeRecord = (record, signer) => {
  return Promise.resolve(records.finalizeRecord(record.record_id, signer))
}

const _revokeAuthorization = (record, reporterKey, properties, signer) => {
  return Promise.resolve(records.revokeReporter(
    record.record_id,
    reporterKey,
    properties,
    signer
  ))
}

module.exports = AssetDetail
