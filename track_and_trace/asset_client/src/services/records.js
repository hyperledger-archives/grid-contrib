'use strict'

const m = require('mithril')
const addressing = require('../utils/addressing')
const transactionService = require('./transaction')
const { SchemaPayload, SchemaCreateAction, SchemaUpdateAction } = require('../protobuf')

const getRecords = () => {
    m.request({
        method: 'GET',
        url: '/grid/record'
    })
}

const fetchRecord = (record_id) => {
    m.request({
        method: 'GET',
        url: `/grid/record/${record_id}`
    })
}

const createRecordTransaction = (signer, properties, associatedAgents)
