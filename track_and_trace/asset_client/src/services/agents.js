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
