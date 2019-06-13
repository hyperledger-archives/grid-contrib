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

const fetchAgent = (publicKey) =>
  m.request({
    method: 'GET',
    url: `/grid/agent/${publicKey}`
  })

const CreateAgentTransaction = (name, orgId, signer) => {
  if (!signer) {
    throw new Error('A signer must be provided')
  }

  let createAgent = CreateAgentAction.create({
    orgId: (orgId === '' ? '000000000' : orgId),
    publicKey: signer.getPublicKey().asHex(),
    active: true,
    roles: [],
    metadata: [
      {
        'name': name
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
    outputs: [agentAddress]
  }, signer, 'pike')
}

const createAgent = (name, orgId, signer) => {
  transactionService.submitBatch([CreateAgentTransaction(name, orgId, signer)], signer)
}

module.exports = {
  createAgent,
  CreateAgentTransaction,
  getAgents,
  fetchAgent
}
