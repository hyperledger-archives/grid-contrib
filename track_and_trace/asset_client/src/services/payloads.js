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

const _ = require('lodash')
const protobuf = require('protobufjs')

// Use the generated JSON to reference the .proto files in protos/
const protoJson = require('../generated_protos.json')

// Keys for payload actions
const SC_ACTIONS = [
  'CREATE_RECORD',
  'FINALIZE_RECORD',
  'CREATE_RECORD_TYPE',
  'UPDATE_PROPERTIES',
  'CREATE_PROPOSAL',
  'ANSWER_PROPOSAL',
  'REVOKE_REPORTER'
]

const PIKE_ACTIONS = [
  'CREATE_AGENT'
]

// Create dictionary with key, enum and class names
const titleify = allCaps => {
  return allCaps
    .split('_')
    .map(word => word[0] + word.slice(1).toLowerCase())
    .join('')
}

const scActionMap = SC_ACTIONS.reduce((map, enumName) => {
  const key = enumName[0].toLowerCase() + titleify(enumName).slice(1)
  const className = titleify(enumName) + 'Action'
  return _.set(map, key, { enum: enumName, name: className })
}, {})

const pikeActionMap = PIKE_ACTIONS.reduce((map, enumName) => {
  const key = enumName[0].toLowerCase() + titleify(enumName).slice(1)
  const className = titleify(enumName) + 'Action'
  return _.set(map, key, { enum: enumName, name: className })
}, {})

// Compile Protobufs
const root = protobuf.Root.fromJSON(protoJson)
const SCPayload = root.lookup('SCPayload')
const PikePayload = root.lookup('PikePayload')
const PropertyValue = root.lookup('TrackAndTracePropertyValue')
const PropertySchema = root.lookup('PropertySchema')
const Location = root.lookup('Location')
const Proposal = root.lookup('Proposal')

_.map(scActionMap, action => {
  return _.set(action, 'proto', root.lookup(action.name))
})

_.map(pikeActionMap, action => {
  return _.set(action, 'proto', root.lookup(action.name))
})

// Create data xforms on an action by action basis
const propertiesXformer = xform => data => {
  return _.set(data, 'properties', data.properties.map(xform))
}
const valueXform = propertiesXformer(prop => PropertyValue.create(prop))
const schemaXform = propertiesXformer(prop => {
  if (prop.locationValue) {
    prop.locationValue = Location.create(prop.locationValue)
  }
  return PropertySchema.create(prop)
})

_.map(scActionMap, action => _.set(action, 'xform', x => x))
scActionMap.createRecord.xform = valueXform
scActionMap.createRecordType.xform = schemaXform
scActionMap.updateProperties.xform = valueXform

_.map(pikeActionMap, action => _.set(action, 'xform', x => x))

/**
 * Encodes a new SCPayload with the specified action
 */
const encode = (actionKey, actionData) => {
  let action, actionFamily
  if (_.has(scActionMap, actionKey)) {
    action = scActionMap[actionKey]
    actionFamily = 'SC'
  } else if (_.has(pikeActionMap, actionKey)) {
    action = pikeActionMap[actionKey]
    actionFamily = 'Pike'
  }
  if (!action) {
    throw new Error('There is no payload action with that key')
  }

  let payload

  switch (actionFamily) {
    case 'SC':
      payload = SCPayload.encode({
        action: SCPayload.Action[action.enum],
        timestamp: Math.floor(Date.now() / 1000),
        [actionKey]: action.proto.create(action.xform(actionData))
      }).finish()
      break
    case 'Pike':
      payload = PikePayload.encode({
        action: PikePayload.Action[action.enum],
        timestamp: Math.floor(Date.now() / 1000),
        [actionKey]: action.proto.create(action.xform(actionData))
      }).finish()
  }

  return payload
}

/**
 * Particular encode methods can be called directly with their key name
 * For example: payloads.createAgent({name: 'Susan'})
 */
const pikeActionMethods = _.reduce(pikeActionMap, (methods, value, key) => {
  return _.set(methods, key, _.partial(encode, key))
}, {})

const scActionMethods = _.reduce(scActionMap, (methods, value, key) => {
  return _.set(methods, key, _.partial(encode, key))
}, {})

// Add enums on an action by action basis
scActionMethods.createRecord.enum = PropertySchema.DataType
scActionMethods.createRecordType.enum = PropertySchema.DataType
scActionMethods.updateProperties.enum = PropertySchema.DataType
scActionMethods.createProposal.enum = Proposal.Role
scActionMethods.answerProposal.enum = scActionMap.answerProposal.proto.Response

module.exports = _.assign({
  encode,
  FLOAT_PRECISION: 1000000
}, scActionMethods, pikeActionMethods)
