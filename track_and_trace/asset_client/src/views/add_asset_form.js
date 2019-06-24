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

const m = require('mithril')

const {PropertyDefinition} = require('../protobuf')
const auth = require('../services/auth')
const records = require('../services/records')
const parsing = require('../services/parsing')
const forms = require('../components/forms')
const layout = require('../components/layout')

/**
 * The Form for tracking a new asset.
 */
const AddAssetForm = {
  oninit (vnode) {
    // Initialize the empty reporters fields
    vnode.state.reporters = [
      {
        reporterKey: '',
        properties: []
      }
    ]
    m.request({
      method: 'GET',
      url: '/grid/agent'
    })
      .then(result => {
        auth.getUserData()
        .then(user => {
          vnode.state.agents = result.filter(agent => agent.public_key !== user.publicKey)
        })
      })
  },

  view (vnode) {
    const setter = forms.stateSetter(vnode.state)
    return [
      m('.add_asset_form',
        m('form', {
          onsubmit: (e) => {
            e.preventDefault()
            _handleSubmit(vnode.state)
            _clearForm(vnode.state)
          }
        },
        m('legend', 'Track New Asset'),
        forms.textInput(setter('serialNumber'), 'Serial Number'),

        layout.row([
          forms.textInput(setter('type'), 'Type')
        ]),

        forms.group('Weight (kg)', forms.field(setter('weight'), {
          type: 'number',
          step: 'any',
          min: 0,
          required: false
        })),

        layout.row([
          forms.group('Latitude', forms.field(setter('latitude'), {
            type: 'number',
            step: 'any',
            min: -90,
            max: 90,
            required: false
          })),
          forms.group('Longitude', forms.field(setter('longitude'), {
            type: 'number',
            step: 'any',
            min: -180,
            max: 180,
            required: false
          }))
        ]),

        m('.row.justify-content-end.align-items-end',
          m('col-2',
            m('button.btn.btn-primary',
              {
                disabled: (
                            !vnode.state.serialNumber ||
                            vnode.state.serialNumber === '' ||
                            !vnode.state.type || vnode.state.type === '' ||
                            !vnode.state.latitude || vnode.state.latitude === '' ||
                            !vnode.state.longitude || vnode.state.longitude === '' ||
                            !vnode.state. weight || vnode.state.weight === ''
                          )
              },
              'Create Record')))))
    ]
  }
}

const _clearForm = (state) => {
  location.reload()
}

/**
 * Handle the form submission.
 *
 * Extract the appropriate values to pass to the create record transaction.
 */
const _handleSubmit = (state) => {
  const properties = [{
    name: 'serialNumber',
    dataType: PropertyDefinition.DataType.STRING,
    stringValue: state.serialNumber
  },
  {
    name: 'type',
    stringValue: state.type,
    dataType: PropertyDefinition.DataType.STRING
  },
  {
    name: 'weight',
    numberValue: parsing.toInt(state.weight),
    dataType: PropertyDefinition.DataType.NUMBER
  },
  {
    name: 'location',
    latLongValue: {
      latitude: parsing.toInt(state.latitude),
      longitude: parsing.toInt(state.longitude)
    },
    dataType: PropertyDefinition.DataType.LAT_LONG
  }]

  auth.getSigner()
    .then((signer) => records.createRecord(properties, signer))
}

module.exports = AddAssetForm
