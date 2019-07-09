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

const fetchRecord = (recordId) => {
  return m.request({
    method: 'GET',
    url: `/grid/record/${recordId}`
  })
}

const createRecordTransaction = (properties, signer) => {
  if (!signer) {
    throw new Error('A signer must be provided')
  }

  let recordId = _generateId()

  let createRecord = CreateRecordAction.create({
    recordId,
    schema: 'asset',
    properties
  })

  let timestamp = Math.floor(Date.now() / 1000)

  let payloadBytes = TrackAndTracePayload.encode({
    action: TrackAndTracePayload.Action.CREATE_RECORD,
    timestamp,
    createRecord
  }).finish()

  let propertyNames = properties.map((property) => property.name)

  let recordAddress = addressing.makeRecordAddress(recordId)
  let schemaAddress = addressing.makeSchemaAddress('asset')
  let agentAddress = addressing.makeAgentAddress(signer.getPublicKey().asHex())
  let propertyAddresses = addressing.makePropertyAddresses(recordId, propertyNames)
  let propertyPageAddresses = addressing.makePropertyPageAddresses(recordId, propertyNames, 1)

  return transactionService.createTransaction({
    payloadBytes,
    inputs: [
      recordAddress,
      schemaAddress,
      agentAddress,
      ...propertyAddresses,
      ...propertyPageAddresses
    ],
    outputs: [
      recordAddress,
      ...propertyAddresses,
      ...propertyPageAddresses
    ]
  }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridSchemaFamily])
}

const createRecord = (properties, signer) => {
  transactionService.submitBatch([createRecordTransaction(properties, signer)], signer)
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
  }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridSchemaFamily])
}

const finalizeRecord = (recordId, signer) => {
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
  }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridSchemaFamily])
}

const updateProperties = (recordId, properties, signer) => {
  transactionService.submitBatch([updatePropertiesTransaction(recordId, properties, signer)],
    signer)
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
    inputs: [
      proposalAddress,
      recordAddress,
      issuingAgentAddress,
      receivingAgentAddress,
      ...propertyAddresses,
      ...propertyPageAddresses
    ],
    outputs: [
      proposalAddress,
      recordAddress,
      ...propertyAddresses,
      ...propertyPageAddresses
    ]
  }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridSchemaFamily])
}

const createProposal = (recordId, receivingAgent, role, properties, terms, signer) => {
  transactionService.submitBatch(
    [createProposalTransaction(recordId, receivingAgent, role, properties, terms, signer)],
    signer
  )
}

const answerProposalTransaction = (
  response,
  recordId,
  receivingAgent,
  role,
  schemaName,
  properties,
  signer) => {
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
    inputs: [
      recordAddress,
      agentAddress,
      proposalAddress,
      schemaAddress,
      ...propertyAddresses,
      ...propertyPageAddresses
    ],
    outputs: [
      recordAddress,
      proposalAddress,
      ...propertyAddresses,
      ...propertyPageAddresses
    ]
  }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridSchemaFamily])
}

const answerProposal = (
  response,
  recordId,
  receivingAgent,
  role,
  schemaName,
  properties,
  signer) => {
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
  }, signer, 'tnt', [addressing.pikeFamily, addressing.tntFamily, addressing.gridSchemaFamily])
}

const revokeReporter = (recordId, reporterId, properties, signer) => {
  transactionService.submitBatch(
    [revokeReporterTransaction(recordId, reporterId, properties, signer)],
    signer
  )
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
