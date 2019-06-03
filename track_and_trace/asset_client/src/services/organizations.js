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
    transactionService.submitBatch([CreateOrganizationTransaction(id, name, address, signer, metadata)], signer)
}

module.exports = {
    createOrganization,
    CreateOrganizationTransaction,
    getOrganizations,
    fetchOrganization,
}