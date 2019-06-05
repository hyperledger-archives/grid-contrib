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

const protos = require('../blockchain/protos')
const {
  awaitServerPubkey,
  getTxnCreator,
  submitTxns,
  encodeTimestampedPayload
} = require('../system/submit_utils')

const DATA = process.env.DATA
if (DATA.indexOf('.json') === -1) {
  throw new Error('Use the "DATA" environment variable to specify a JSON file')
}

const types = require(`./${DATA}`)

protos.compile()
  .then(awaitServerPubkey)
  .then(batcherPublicKey => getTxnCreator(null, batcherPublicKey))
  .then(({createTxn, signer, signerPublicKey}) => {
    const typePayloads = types.map(type => {
      return encodeTimestampedPayload({
        action: protos.SchemaPayload.Action.SCHEMA_CREATE,
        createSchema: protos.SchemaCreateAction.create({
          schema_name: type.name,
          properties: [...type.properties]
        })
      })
    })

    const txns = typePayloads.map(payload => createTxn(payload))
    return submitTxns(txns, signer, signerPublicKey)
  })
  .catch(err => {
    console.log("error in protos compile")
    console.error(err.toString())
    process.exit()
  })
