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

const m = require('mithril')
const { createHash } = require('crypto')
const { Transaction,
        TransactionHeader,
        Batch,
        BatchHeader,
        BatchList } = require('sawtooth-sdk/protobuf')

const { SabrePayload, ExecuteContractAction } = require('../protobuf')

const addressing = require('../utils/addressing')

const createTransaction = (payloadInfo, signer, family) => {
    let { payloadBytes, inputs, outputs } = payloadInfo
    let pubkey = signer.getPublicKey().asHex()

    switch (family) {
        case 'pike':
            family = addressing.pikeFamily
            break
        case 'tnt':
            family = addressing.tntFamily
            break
        default:
            family = addressing.tntFamily
    }

    const executeContractAction = ExecuteContractAction.create({
        name: family.name,
        version: family.version,
        inputs: inputs,
        outputs: outputs,
        payload: payloadBytes,
    })

    const sabrePayloadBytes = SabrePayload.encode({
        action: SabrePayload.Action.EXECUTE_CONTRACT,
        executeContract: executeContractAction,
    }).finish()

    var inputAddresses = [
        addressing.computeContractRegistryAddress(family.name),
        addressing.computeContractAddress(family.name, family.version)
    ]

    inputs.forEach(function(input) {
        inputAddresses.push(addressing.computeNamespaceRegistryAddress(input))
    })
    inputAddresses = inputAddresses.concat(inputs)

    var outputAddresses = [
        addressing.computeContractRegistryAddress(family.name),
        addressing.computeContractAddress(family.name, family.version)
    ]

    outputs.forEach(function(output) {
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

const submitBatch = (transactions, signer) => {
    let transactionIds = transactions.map((txn) => txn.headerSignature)
    let pubkey = signer.getPublicKey().asHex()

    const batchHeaderBytes = BatchHeader.encode({
        signerPublicKey: pubkey,
        transactionIds,
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

    return m.request({
        method: 'POST',
        url: '/grid/batches',
        data: batchListBytes,
        headers: { "Content-Type": "application/octet-stream" },
        serialize: x => x
    })
        .then((result) =>
            _waitForCommit(
                transactionIds, _formStatusUrl(result.link)
            )
        )
}

const submitTransaction = (payloadInfo, signer) => {
    const transactions = [createTransaction(payloadInfo, signer)]
    return submitBatch(transactions, signer)
}

const _formStatusUrl = (url) => {
    let qs = m.parseQueryString(/(id=)\w+/g.exec(url)[0])
    let id = (qs.id ? `id=${qs.id}` : '')
    return `/grid/batch_statuses?${id}`
}

const _waitForCommit = (transactionIds, statusUrl) =>
    m.request({
        url: `${_formStatusUrl(statusUrl)}&wait=60`,
        method: 'GET'
    })
        .catch((e) => Promise.reject(e.message))
        .then((result) => {
            let batch_result = result.data[0]
            if (batch_result.status === 'COMMITTED') {
                return Promise.resolve(transactionIds)
            } else if (batch_result.status === 'INVALID') {
                let transaction_result = batch_result
                    .invalid_transactions
                    .find((txn) => transactionIds.includes(txn.id))
                if (transaction_result) {
                    return Promise.reject(transaction_result.message)
                } else {
                    return Promise.reject('Invalid Transaction')
                }
            } else {
                return _waitForCommit(transactionIds, statusUrl)
            }
        })

module.exports = {
    submitBatch,
    submitTransaction,
    createTransaction,
}
