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
const uuid = require('uuid/v4')
const addressing = require('../utils/addressing')
const transactionService = require('./transaction')
const { CreateRecordAction,
        TrackAndTracePayload,
        FinalizeRecordAction,
        CreateProposalAction,
        UpdatePropertiesAction,
        AnswerProposalAction,
        RevokeReporterAction
    } = require('../protobuf')

const _generateId = () => {
    return uuid()
}

const getRecords = () => {
    m.request({
        method: 'GET',
        url: '/grid/record'
    })
}

const fetchRecord = (record_id) => {
    return m.request({
        method: 'GET',
        url: `/grid/record/${record_id}`
    })
}

const createRecordTransaction = (properties, propertyNames, signer) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let recordId = _generateId()

    let createRecord = CreateRecordAction.create({
        recordId,
        schema: 'fish',
        properties
    })

    let timestamp = Math.floor(Date.now() / 1000)

    let payloadBytes = TrackAndTracePayload.encode({
        action: TrackAndTracePayload.Action.CREATE_RECORD,
        timestamp,
        createRecord
    }).finish()

    let recordAddress = addressing.makeRecordAddress(recordId)
    let schemaAddress = addressing.makeSchemaAddress('fish')
    let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())
    let propertyAddresses = addressing.makePropertyAddresses(recordId, propertyNames)
    let propertyPageAddresses = addressing.makePropertyPageAddresses(recordId, propertyNames, 1)

    return transactionService.createTransaction({
        payloadBytes,
        inputs: [recordAddress, schemaAddress, agentAddress, ...propertyAddresses, ...propertyPageAddresses],
        outputs: [recordAddress, ...propertyAddresses, ...propertyPageAddresses],
    }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridFamily])
}

const createRecord = (properties, propertyNames, signer) => {
  let record = createRecordTransaction(properties, propertyNames, signer)
  transactionService.submitBatch([record], signer)
}

const finalizeRecordTransaction = (recordId, signer) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let finalizeRecord = FinalizeRecordAction.create({
        recordId
    })

    let timestamp = Math.floor(Date.now() / 1000)

    let payloadBytes = TrackAndTracePayload.encode({
        action: TrackAndTracePayload.Action.FINALIZE_RECORD,
        timestamp,
        finalizeRecord
    }).finish()

    let recordAddress = addressing.makeRecordAddress(recordId)
    let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())

    return transactionService.createTransaction({
        payloadBytes,
        inputs: [recordAddress, agentAddress],
        outputs: [recordAddress]
    }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridFamily])
}

const finalizeRecord= (recordId, signer) => {
    transactionService.submitBatch([finalizeRecordTransaction(recordId, signer)], signer)
}

const updatePropertiesTransaction = (recordId, properties, signer) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let updateProperties = UpdatePropertiesAction.create({
        recordId,
        properties
    })

    let timestamp = Math.floor(Date.now() / 1000)

    let payloadBytes = TrackAndTracePayload.encode({
        action: TrackAndTracePayload.Action.UPDATE_PROPERTIES,
        timestamp,
        updateProperties
    }).finish()

    let propertyNames = properties.map((property) => property.name)

    let recordAddress = addressing.makeRecordAddress(recordId)
    let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())
    let propertyAddresses = addressing.makePropertyAddresses(recordId, propertyNames)
    let propertyPageAddresses = addressing.makePropertyPageAddresses(recordId, propertyNames, 1)
    return transactionService.createTransaction({
        payloadBytes,
        inputs: [recordAddress, agentAddress, ...propertyAddresses, ...propertyPageAddresses],
        outputs: [recordAddress, ...propertyAddresses, ...propertyPageAddresses]
    }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridFamily])
}

const updateProperties = (recordId, properties, signer) => {
    transactionService.submitBatch([updatePropertiesTransaction(recordId, properties, signer)], signer)
}

const createProposalTransaction = (recordId, receivingAgent, role, properties, terms, signer) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let createProposal = CreateProposalAction.create({
        recordId,
        receivingAgent,
        role,
        properties,
        terms
    })

    let timestamp = Math.floor(Date.now() / 1000)

    let payloadBytes = TrackAndTracePayload.encode({
        action: TrackAndTracePayload.Action.CREATE_PROPOSAL,
        timestamp,
        createProposal
    }).finish()

    let proposalAddress = addressing.makeProposalAddress(recordId, receivingAgent, timestamp)
    let recordAddress = addressing.makeRecordAddress(recordId)
    let issuingAgentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())
    let receivingAgentAddress = addressing.makeAgentAddress(receivingAgent)
    let propertyAddresses = addressing.makePropertyAddresses(recordId, properties)
    let propertyPageAddresses = addressing.makePropertyPageAddresses(recordId, properties, 1)

    return transactionService.createTransaction({
        payloadBytes,
        inputs: [proposalAddress, recordAddress, issuingAgentAddress, receivingAgentAddress, ...propertyAddresses, ...propertyPageAddresses],
        outputs: [proposalAddress, recordAddress, ...propertyAddresses, ...propertyPageAddresses]
    }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridFamily])
}

const createProposal = (recordId, receivingAgent, role, properties, terms, signer) => {
    transactionService.submitBatch([createProposalTransaction(recordId, receivingAgent, role, properties, terms, signer)], signer)
}

const answerProposalTransaction = (response, recordId, receivingAgent, role, schemaName, properties, signer) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let answerProposal = AnswerProposalAction.create({
        recordId,
        receivingAgent,
        role,
        response
    })

    let timestamp = Math.floor(Date.now() / 1000)

    let payloadBytes = TrackAndTracePayload.encode({
        action: TrackAndTracePayload.Action.ANSWER_PROPOSAL,
        timestamp,
        answerProposal
    }).finish()

    let recordAddress = addressing.makeRecordAddress(recordId)
    let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())
    let proposalAddress = addressing.makeProposalAddress(recordId, receivingAgent)
    let schemaAddress = addressing.makeSchemaAddress(schemaName)
    let propertyAddresses = addressing.makePropertyAddresses(recordId, properties)
    let propertyPageAddresses = addressing.makePropertyPageAddresses(recordId, properties, 1)

    return transactionService.createTransaction({
        payloadBytes,
        inputs: [recordAddress, agentAddress, proposalAddress, schemaAddress, ...propertyAddresses, ...propertyPageAddresses],
        outputs: [recordAddress, proposalAddress, ...propertyAddresses, ...propertyPageAddresses]
    }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridFamily])
}

const answerProposal = (response, recordId, receivingAgent, role, schemaName, properties, signer) => {
    transactionService.submitBatch([answerProposalTransaction(response,
                                                              recordId,
                                                              receivingAgent,
                                                              role,
                                                              schemaName,
                                                              properties,
                                                              signer)], signer)
}

const revokeReporterTransaction = (recordId, reporterId, properties, signer) => {
    if (!signer) {
        throw new Error('A signer must be provided')
    }

    let revokeReporter = RevokeReporterAction.create({
        recordId,
        reporterId,
        properties
    })

    let timestamp = Math.floor(Date.now() / 1000)

    let payloadBytes = TrackAndTracePayload.encode({
        action: TrackAndTracePayload.Action.REVOKE_REPORTER,
        timestamp,
        revokeReporter
    }).finish()

    let recordAddress = addressing.makeRecordAddress(recordId)
    let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())
    let propertyAddresses = addressing.makePropertyAddresses(recordId, properties)
    let propertyPageAddresses = addressing.makePropertyPageAddresses(recordId, properties, 1)

    return transactionService.createTransaction({
        payloadBytes,
        inputs: [recordAddress, agentAddress, ...propertyAddresses, ...propertyPageAddresses],
        outputs: [recordAddress, ...propertyAddresses, ...propertyPageAddresses]
    }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridFamily])
}

const revokeReporter = (recordId, reporterId, properties, signer) => {
    transactionService.submitBatch([revokeReporterTransaction(recordId, reporterId, properties, signer)], signer)
}

module.exports = {
    getRecords,
    fetchRecord,
    createRecord,
    finalizeRecord,
    updateProperties,
    createProposal,
    answerProposal,
    revokeReporter
}
