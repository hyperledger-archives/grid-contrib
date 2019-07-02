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

const api = require('../services/api')
const {PropertyDefinition} = require('../protobuf')
const auth = require('../services/auth')
const records = require('../services/records')
const parsing = require('../services/parsing')
const {MultiSelect} = require('../components/forms')
const layout = require('../components/layout')

/**
 * Possible selection options
 */
const authorizableProperties = [
  'location',
  'tilt',
  'temperature',
  'shock'
]

/**
 * The Form for tracking a new fish.
 */
const AddFishForm = {
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
    return m('.fish_form',
             m('form', {
               onsubmit: (e) => {
                 e.preventDefault()
                 _handleSubmit(vnode.state)
                 _clearForm(vnode.state)
               }
             },
             m('legend', 'Track New Fish'),
             _formGroup('Serial Number', m('input.form-control', {
               type: 'text',
               oninput: m.withAttr('value', (value) => {
                 vnode.state.serialNumber = value
               }),
               value: vnode.state.serialNumber
             })),
             _formGroup('Species (ASFIS 3-letter code)', m('input.form-control', {
               type: 'text',
               oninput: m.withAttr('value', (value) => {
                 vnode.state.species = value
               }),
               value: vnode.state.species
             })),

             layout.row([
               _formGroup('Length (cm)', m('input.form-control', {
                 type: 'number',
                 min: 0,
                 step: 'any',
                 oninput: m.withAttr('value', (value) => {
                   vnode.state.lengthInCM = value
                 }),
                 value: vnode.state.lengthInCM
               })),
               _formGroup('Weight (kg)', m('input.form-control', {
                 type: 'number',
                 step: 'any',
                 oninput: m.withAttr('value', (value) => {
                   vnode.state.weightInKg = value
                 }),
                 value: vnode.state.weightInKg
               }))
             ]),

             layout.row([
               _formGroup('Latitude', m('input.form-control', {
                 type: 'number',
                 step: 'any',
                 min: -90,
                 max: 90,
                 oninput: m.withAttr('value', (value) => {
                   vnode.state.latitude = value
                 }),
                 value: vnode.state.latitude
               })),
               _formGroup('Longitude', m('input.form-control', {
                 type: 'number',
                 step: 'any',
                 min: -180,
                 max: 180,
                 oninput: m.withAttr('value', (value) => {
                   vnode.state.longitude = value
                 }),
                 value: vnode.state.longitude
               }))
             ]),

             m('.row.justify-content-end.align-items-end',
               m('col-2',
                 m('button.btn.btn-primary',
                 {
                disabled: (
                            !vnode.state.serialNumber ||
                            vnode.state.serialNumber === '' ||
                            !vnode.state.species || vnode.state.species === '' ||
                            !vnode.state.latitude || vnode.state.latitude === '' ||
                            !vnode.state.longitude || vnode.state.longitude === '' ||
                            !vnode.state.lengthInCM || vnode.state.lengthInCM === '' ||
                            !vnode.state.weightInKg || vnode.state.weightInKg === ''
                          )
              },
                   'Create Record')))))
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
  const properties = [
    {
      name: 'serialNumber',
      stringValue: state.serialNumber,
      dataType: PropertyDefinition.DataType.STRING
    },
    {
    name: 'species',
    stringValue: state.species,
    dataType: PropertyDefinition.DataType.STRING
  },
  {
    name: 'length',
    numberValue: parsing.toInt(state.lengthInCM),
    dataType: PropertyDefinition.DataType.NUMBER
  },
  {
    name: 'weight',
    numberValue: parsing.toInt(state.weightInKg),
    dataType: PropertyDefinition.DataType.NUMBER
  },
  {
    name: 'location',
    latLongValue: {
      latitude: parsing.toInt(state.latitude),
      longitude: parsing.toInt(state.longitude)
    },
    dataType: PropertyDefinition.DataType.LAT_LONG
  }
]
let propertyNames = properties.map((property) => property.name)
propertyNames.push("temperature")
propertyNames.push("tilt")
propertyNames.push("shock")

auth.getSigner()
   .then((signer) => records.createRecord(properties, propertyNames, signer))
 }

/**
 * Create a form group (this is a styled form-group with a label).
 */
const _formGroup = (label, formEl) =>
  m('.form-group',
    m('label', label),
    formEl)

module.exports = AddFishForm
