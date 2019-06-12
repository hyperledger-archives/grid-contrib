// Copyright 2019 Cargill Incorporated
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

const m = require('mithril')
const addressing = require('../utils/addressing')
const transactionService = require('./transaction.js')
const { PikePayload, CreateOrganizationAction } = require('../protobuf')

const getOrganizations = () =>
    m.request({
        method: 'GET',
        url: '/grid/organization'
    })

const fetchOrganization = (id) =>
    m.request({
        method: 'GET',
        url: `/grid/organization/${id}`
    })

const CreateOrganizationTransaction = (id, name, address, signer, metadata) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let createOrganization = CreateOrganizationAction.create({
        id,
        name,
        address,
        metadata: [
            {...metadata}
        ]
    })
    let payloadBytes = PikePayload.encode({
        action: PikePayload.Action.CREATE_ORGANIZATION,
        createOrganization
    }).finish()

    let organizationAddress = addressing.makeOrganizationAddress(id)
    let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())

    return transactionService.createTransaction({
        payloadBytes,
        inputs: [organizationAddress, agentAddress],
        outputs: [organizationAddress, agentAddress],
    }, signer, 'pike')
}

const createOrganization = (id, name, address, signer, metadata) => {
    return transactionService.submitBatch([CreateOrganizationTransaction(id, name, address, signer, metadata)], signer)
}

module.exports = {
    createOrganization,
    CreateOrganizationTransaction,
    getOrganizations,
    fetchOrganization,
}
