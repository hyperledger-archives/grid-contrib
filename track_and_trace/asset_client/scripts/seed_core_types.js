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

const {
  awaitServerReady,
  createSeedUser,
  createSchemas,
  createSigner,
  createOrganization,
  updateAgent
} = require('./utils/submit_utils')

const data = require('../sample_data/core_data.json')

awaitServerReady()
  .then(() => {
    data.map((org) => {
      createSigner(org.password)
      .then(({signer, encryptedPrivateKey}) => {
        return createSeedUser(org, signer, encryptedPrivateKey)
      })
      .then(({org, signer}) => {
        return createOrganization(org, signer)
      })
      .then((signer) => {
        return updateAgent(org, signer, ['admin', 'can_create_schema', 'can_update_schema'])
      })
      .then((signer) => {
        return createSchemas(org, signer)
      })
      .catch((err) => {
        console.error(err)
      })
    })
  })
  .catch(err => {
    console.error(`error in protos compile: ${err.toString()}`)
    process.exit()
  })
