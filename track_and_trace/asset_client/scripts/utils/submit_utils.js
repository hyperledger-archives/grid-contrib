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

const sjcl = require('sjcl')
const request = require('request-promise-native')
const { createHash } = require('crypto')
const { createContext, CryptoFactory } = require('sawtooth-sdk/signing')
const {
  Transaction,
  TransactionHeader,
  Batch,
  BatchHeader,
  BatchList
} = require('sawtooth-sdk/protobuf')
const protos = require('../../src/protobuf')
const addressing = require('../../src/utils/addressing')

const CRYPTO_CONTEXT = createContext('secp256k1')
const CRYPTO_FACTORY = new CryptoFactory(CRYPTO_CONTEXT)

const TNT_SERVER = process.env.SERVER || 'http://localhost:8021/api'
const GRID_SERVER = process.env.GRID || 'http://localhost:8021/grid'

const RETRY_WAIT = process.env.RETRY_WAIT || 5000

const awaitServerReady = () => {
  console.log(`Server: ${TNT_SERVER}`)
  return request(`${TNT_SERVER}/info`)
    .catch(() => {
      console.warn(
        `Server unavailable, retrying in ${RETRY_WAIT / 1000} seconds...`)
      return new Promise(resolve => setTimeout(resolve, RETRY_WAIT))
        .then(awaitServerReady)
    })
}

const createTxn = (payload, signer, family, contracts) => {
  let { payloadBytes, inputs, outputs } = payload
  const pubkey = signer.getPublicKey().asHex()

  switch (family) {
    case 'pike':
      family = addressing.pikeFamily
      break
    case 'tnt':
      family = addressing.tntFamily
      break
    case 'schema':
      family = addressing.gridSchemaFamily
      break
    default:
      family = addressing.tntFamily
  }

  if (!contracts || contracts.length === 0) {
    contracts = [family]
  }

  const executeContractAction = protos.ExecuteContractAction.create({
    name: family.name,
    version: family.version,
    inputs: inputs,
    outputs: outputs,
    payload: payloadBytes
  })

  const sabrePayloadBytes = protos.SabrePayload.encode({
    action: protos.SabrePayload.Action.EXECUTE_CONTRACT,
    executeContract: executeContractAction
  }).finish()

  var inputAddresses = [
    ...addressing.computeContractRegistryAddresses(contracts),
    ...addressing.computeContractAddresses(contracts)
  ]

  inputs.forEach(function (input) {
    inputAddresses.push(addressing.computeNamespaceRegistryAddress(input))
  })
  inputAddresses = inputAddresses.concat(inputs)

  var outputAddresses = [
    ...addressing.computeContractRegistryAddresses(contracts),
    ...addressing.computeContractAddresses(contracts)
  ]

  outputs.forEach(function (output) {
    outputAddresses.push(addressing.computeNamespaceRegistryAddress(output))
  })
  outputAddresses = outputAddresses.concat(outputs)

  const transactionHeaderBytes = TransactionHeader.encode({
    familyName: addressing.sabreFamily.name,
    familyVersion: addressing.sabreFamily.version,
    inputs: inputAddresses,
    outputs: outputAddresses,
    signerPublicKey: pubkey,
    batcherPublicKey: pubkey,
    dependencies: [],
    payloadSha512: createHash('sha512').update(sabrePayloadBytes).digest('hex')
  }).finish()

  let signature = signer.sign(transactionHeaderBytes)

  return Transaction.create({
    header: transactionHeaderBytes,
    headerSignature: signature,
    payload: sabrePayloadBytes
  })
}

const submitTxns = (transactions, signer) => {
  let transactionIds = transactions.map((txn) => txn.headerSignature)
  let signerPublicKey = signer.getPublicKey().asHex()

  const batchHeaderBytes = BatchHeader.encode({
    signerPublicKey,
    transactionIds
  }).finish()

  let signature = signer.sign(batchHeaderBytes)

  const batch = Batch.create({
    header: batchHeaderBytes,
    headerSignature: signature,
    transactions
  })

  const batchListBytes = BatchList.encode({
    batches: [batch]
  }).finish()

  return request({
    method: 'POST',
    url: `${GRID_SERVER}/batches`,
    headers: { 'Content-Type': 'application/octet-stream' },
    body: batchListBytes
  })
    .then((body) => {
      let link = JSON.parse(body).link
      _waitForCommit(
        transactionIds,
        _formStatusUrl(link)
      )
      return signer
    })
    .catch((err) => {
      console.log(err)
    })
}

const createSeedUser = (org, signer, encryptedPrivateKey) => {
  let publicKey = signer.getPublicKey().asHex()

  return request({
    method: 'POST',
    url: `${TNT_SERVER}/users`,
    body: {
      email: org.email,
      password: org.password,
      encryptedPrivateKey,
      publicKey
    },
    json: true
  })
    .catch((e) => {
      if (e.error && e.statusCode === 400) {
        return Promise.reject(e.error.message)
      } else {
        return Promise.reject('Unable to create seed user')
      }
    })
    .then((result) => {
      if (result.status === 'ok') {
        return { org, signer }
      }
    })
}

const createSchemas = (org, signer) => {
  let txns = org.schemas.map((schema) => createSchemaTransaction(schema, signer))

  return submitTxns(txns, signer)
}

const createSchemaTransaction = (schema, signer) => {
  if (!signer) {
    console.error('a signer must be provided')
  }

  let schemaCreate = protos.SchemaCreateAction.create({
    schemaName: schema.name,
    description: schema.description,
    properties: schema.properties
  })

  let payloadBytes = protos.SchemaPayload.encode({
    action: protos.SchemaPayload.Action.SCHEMA_CREATE,
    schemaCreate
  }).finish()

  let schemaAddress = addressing.makeSchemaAddress(schema.name)
  let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())

  return createTxn({
    payloadBytes,
    inputs: [schemaAddress, agentAddress],
    outputs: [schemaAddress]
  }, signer, 'schema')
}

const createSigner = (password) => {
  let privateKey = CRYPTO_CONTEXT.newRandomPrivateKey()
  let signer = CRYPTO_FACTORY.newSigner(privateKey)

  let encryptedPrivateKey = sjcl.encrypt(password, privateKey.asHex())

  return Promise.resolve({ signer, encryptedPrivateKey })
}

const createOrganizationTransaction = (org, signer) => {
  if (!signer) {
    console.error('A signer must be provided')
  }

  let createOrganization = protos.CreateOrganizationAction.create({
    id: org.org_id,
    name: org.org_name,
    address: org.org_address,
    metadata: [
      { ...org.metadata }
    ]
  })

  let payloadBytes = protos.PikePayload.encode({
    action: protos.PikePayload.Action.CREATE_ORGANIZATION,
    createOrganization
  }).finish()

  let organizationAddress = addressing.makeOrganizationAddress(org.org_id)
  let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())

  return createTxn({
    payloadBytes,
    inputs: [organizationAddress, agentAddress],
    outputs: [organizationAddress, agentAddress]
  }, signer, 'pike')
}

const createOrganization = (org, signer) => {
  return submitTxns([createOrganizationTransaction(org, signer)], signer)
}

const updateAgentPermissions = (org, signer, roles) => {
  let updateAgent = protos.UpdateAgentAction.create({
    orgId: org.org_id,
    publicKey: signer.getPublicKey().asHex(),
    roles,
    active: true
  })

  let payloadBytes = protos.PikePayload.encode({
    action: protos.PikePayload.Action.UPDATE_AGENT,
    updateAgent
  }).finish()

  let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())

  return createTxn({
    payloadBytes,
    inputs: [agentAddress],
    outputs: [agentAddress]
  }, signer, 'pike')
}

const updateAgent = (org, signer, roles) => {
  return submitTxns([updateAgentPermissions(org, signer, roles)], signer)
}

const _formStatusUrl = (url) => {
  let URL = require('url').URL
  let qs = new URL(url).searchParams

  let id = (qs.get('id') ? `id=${qs.get('id')}` : '')
  return `${GRID_SERVER}/batch_statuses?${id}`
}

const _waitForCommit = (transactionIds, statusUrl) =>
  request({
    url: `${_formStatusUrl(statusUrl)}&wait=60`,
    method: 'GET'
  })
    .catch((e) => Promise.reject(e.message))
    .then((result) => {
      let batchResult = JSON.parse(result).data[0]
      if (batchResult.status === 'COMMITTED') {
        console.log('Seed data batch committed')
      } else if (batchResult.status === 'INVALID') {
        let transactionResult = batchResult.invalid_transactions
          .find((txn) => transactionIds.includes(txn.id))
        if (transactionResult) {
          console.error(`Error seeding data: ${transactionResult.message}`)
          return Promise.reject()
        } else {
          console.error('Invalid Transaction')
          return Promise.reject()
        }
      } else {
        return _waitForCommit(transactionIds, statusUrl)
      }
    })

module.exports = {
  awaitServerReady,
  submitTxns,
  createSeedUser,
  createSchemas,
  createSigner,
  createOrganization,
  updateAgent,
  createTxn,
  createOrganizationTransaction
}
