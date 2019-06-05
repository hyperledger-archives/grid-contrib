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
const protos = require('../blockchain/protos')

const FAMILY_NAME = 'grid_track_and_trace'
const FAMILY_VERSION = '1.0'

const SERVER = process.env.SERVER || 'http://localhost:8021/api'
const RETRY_WAIT = process.env.RETRY_WAIT || 5000

const hash =(object, num) => {
  let sha = createHash("sha512")
  return sha.update(object).digest("hex").substring(0, num)
}

const awaitServerInfo = () => {
  console.log(`Server: ${SERVER}`)
  return request(`${SERVER}/api/info`)
    .catch(() => {
      console.warn(
        `Server unavailable, retrying in ${RETRY_WAIT / 1000} seconds...`)
      return new Promise(resolve => setTimeout(resolve, RETRY_WAIT))
        .then(awaitServerInfo)
    })
}

const awaitServerPubkey = () => {
  return awaitServerInfo().then(info => JSON.parse(info).pubkey)
}

const encodeHeader = (signerPublicKey, batcherPublicKey, payload) => {
  const GRID_SCHEMA_NAMESPACE = hash(FAMILY_NAME,6) + '01'
  return TransactionHeader.encode({
    signerPublicKey,
    batcherPublicKey,
    familyName: FAMILY_NAME,
    familyVersion: FAMILY_VERSION,
    inputs: [GRID_SCHEMA_NAMESPACE],
    outputs: [GRID_SCHEAM_NAMESPACE],
    payloadSha512: createHash('sha512').update(payload).digest('hex')
  }).finish()
}

const getTxnCreator = (privateKeyHex = null, batcherPublicKeyHex = null) => {
  const context = createContext('secp256k1')
  const cryptoFactory = new CryptoFactory(context)
  const privateKey = privateKeyHex === null
    ? context.newRandomPrivateKey()
    : secp256k1.Secp256k1PrivateKey.fromHex(privateKeyHex)

  const signer = cryptoFactory.newSigner(privateKey)

  const signerPublicKey = signer.getPublicKey().asHex()
  const batcherPublicKey = signerPublicKey

  let createTxn = payload => {
    const header = encodeHeader(signerPublicKey, batcherPublicKey, payload)
    const headerSignature = signer.sign(header)
    return Transaction.create({ header, headerSignature, payload })
  }

  return {
    createTxn,
    signer,
    signerPublicKey
  }
}

const submitTxns = (transactions, signer, signerPublicKey) => {
  let transactionIds = transactions.map((txn) => txn.headerSignature)

  const batchHeaderBytes = BatchHeader.encode({
    signerPublicKey: signerPublicKey,
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

  console.log(`Server: ${SERVER}`)
  return request({
    method: 'POST',
    url: `${SERVER}/grid/batches`,
    headers: { 'Content-Type': 'application/octet-stream' },
    encoding: null,
    body: batchListBytes
  })
}

const encodeTimestampedPayload = message => {
  return protos.SchemaPayload.encode(_.assign({
    timestamp: Math.floor(Date.now() / 1000)
  }, message)).finish()
}

module.exports = {
  awaitServerPubkey,
  getTxnCreator,
  submitTxns,
  encodeTimestampedPayload
}
