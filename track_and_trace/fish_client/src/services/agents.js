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
const addressing = require('../utils/addressing')
const transactionService = require('./transaction.js')
const { PikePayload, CreateAgentAction } = require('../protobuf')

const getAgents = () =>
    m.request({
        method: 'GET',
        url: '/grid/agent'
    })

const fetchAgent = (public_key) =>
    m.request({
        method: 'GET',
        url: `/grid/agent/${public_key}`
    })

const CreateAgentTransaction = (name, org_id, signer) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let createAgent = CreateAgentAction.create({
        orgId: (org_id === '' ? '000000000': org_id),
        publicKey: signer.getPublicKey().asHex(),
        active: true,
        roles:[],
        metadata: [
            {
                "name": name
            }
        ]
    })
    let payloadBytes = PikePayload.encode({
        action: PikePayload.Action.CREATE_AGENT,
        createAgent
    }).finish()

    let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())

    return transactionService.createTransaction({
        payloadBytes,
        inputs: [agentAddress],
        outputs: [agentAddress],
    }, signer, 'pike')
}

const createAgent = (name, org_id, signer) => {
    transactionService.submitBatch([CreateAgentTransaction(name, org_id, signer)], signer)
}

module.exports = {
    createAgent,
    CreateAgentTransaction,
    getAgents,
    fetchAgent,
}
