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
const sjcl = require('sjcl')
const { createContext, CryptoFactory } = require('sawtooth-sdk/signing')
const { Secp256k1PrivateKey } = require('sawtooth-sdk/signing/secp256k1')
const { pluck } = require('../utils')
const modals = require('../components/modals')
const api = require('./api')

const STORE_PRIVATE_KEY = 'privateKey'
const STORE_USER = 'user'
const AUTH_KEY = 'authorization'

const CRYPTO_CONTEXT = createContext('secp256k1')
const CRYPTO_FACTORY = new CryptoFactory(CRYPTO_CONTEXT)

let _authStoreCachedSigner = null

const _localStoreSave = (key, value) => {
  localStorage.setItem(`${AuthService.namespace}/${key}`, value)
}

const _localStoreGet = (key) => {
  localStorage.getItem(`${AuthService.namespace}/${key}`)
}

const _localStoreRemove = (key) => {
  localStorage.removeItem(`${AuthService.namespace}/${key}`)
}

const _sessionStoreSave = (key, value) => {
  sessionStorage.setItem(`${AuthService.namespace}/${key}`, value)
}

const _sessionStoreGet = (key) => {
  sessionStorage.getItem(`${AuthService.namespace}/${key}`)
}

const _sessionStoreRemove= (key) => {
  sessionStorage.removeItem(`${AuthService.namespace}/${key}`)
}

const requestPassword = () => {

  return modals.show(modals.BasicModal, {
    title: 'Enter Password',
    body: '',
    acceptText: 'Submit',
    acceptFn: authenticate()
  })
}

const displaySuccessDialog = () => {
  return modals.show(modals.StatusModal, {
    title: 'Success',
    body: 'User updated successfully!'
  })
}

const AuthService = {
  namespace: 'asset_track',

  isSignedIn: () => Boolean(_localStoreGet(STORE_USER)),

  setUserData: (user, password) => {
    // invalidate cache
    _authStoreCachedSigner = null

    let storedUser = pluck(user, 'publicKey', 'email', 'encryptedPrivateKey')
    _localStoreSave(STORE_USER, JSON.stringify(storedUser))

    let decryptedKey = sjcl.decrypt(password, user.encryptedPrivateKey)
    _sessionStoreSave(STORE_PRIVATE_KEY, decryptedKey)
  },

  updateUserData: (update) => {
    AuthService.getUserData()
      .then((user) => {
        let currentUser = pluck(user, 'username', 'publicKey', 'email', 'encryptedPrivateKey')
        currentUser.encryptedPrivateKey = update.encryptedPrivateKey
        _localStoreSave(STORE_USER, JSON.stringify(currentUser))

        let decryptedKey = sjcl.decrypt(update.password, update.encryptedPrivateKey)
        _sessionStoreSave(STORE_PRIVATE_KEY, decryptedKey)
      })
  },

  getUserData: () => new Promise((resolve, reject) => {
    let userStr = _localStoreGet(STORE_USER)
    if (!userStr) {
      reject('No user data available. Please log in')
      return
    }

    try {
      resolve(JSON.parse(userStr))
    } catch (e) {
      reject(e)
    }
  }),

  getPrivateKey: () => new Promise((resolve, reject) => {
    let key = sessionStorage.getItem('asset_track/privateKey')
    if (!key) {
      reject('No private key available. Try logging in')
      return
    }

    try {
      resolve(key)
    } catch (e) {
      reject(e)
    }
  }),

  getSigner: () => {
    if (_authStoreCachedSigner) {
      return Promise.resolve(_authStoreCachedSigner)
    }

    let sessionStoredKey = _sessionStoreGet(STORE_PRIVATE_KEY)
    if (sessionStoredKey) {
      let signer = CRYPTO_FACTORY.newSigner(Secp256k1PrivateKey.fromHex(sessionStoredKey))
      _authStoreCachedSigner = signer
      return Promise.resolve(signer)
    }

    return AuthService.getUserData()
      .then((user) => Promise.all([user, requestPassword()]))
      .then(([user, password]) => {
        let decryptedKey = sjcl.decrypt(password, user.encryptedPrivateKey)
        _sessionStoreSave(STORE_PRIVATE_KEY, decryptedKey)
        let signer = CRYPTO_FACTORY.newSigner(Secp256k1PrivateKey.fromHex(decryptedKey))
        _authStoreCachedSigner = signer
        return Promise.resolve(signer)
      })
  },

  /**
     *  Returns a new signer and encrypted private key
     */
  createSigner: (password) => {
    if (AuthService.isSignedIn()) {
      return Promise.reject('You\'re already signed in!')
    }

    let privateKey = CRYPTO_CONTEXT.newRandomPrivateKey()
    let signer = CRYPTO_FACTORY.newSigner(privateKey)

    _authStoreCachedSigner = signer
    _sessionStoreSave(STORE_PRIVATE_KEY, privateKey.asHex())

    let encryptedPrivateKey = sjcl.encrypt(password, privateKey.asHex())

    return Promise.resolve({ signer, encryptedPrivateKey })
  },

  signOut: () => {
    _authStoreCachedSigner = null

    _localStoreRemove(STORE_USER)
    _localStoreRemove(AUTH_KEY)
    _sessionStoreRemove(STORE_PRIVATE_KEY)

    // clear cached auth token
    api.clearAuth()

    return Promise.resolve()
  },

  authenticate: (email, password) => {
    return m.request({
      method: 'POST',
      url: '/api/authorization',
      data: { email, password }
    })
      .then((user) => {
        api.setAuth(user.authorization)
        AuthService.setUserData(user.user, password)
      })
      .catch((e) => {
        if (e.error && e.errorStatus === 401) {
          return Promise.reject('User not found')
        } else {
          return Promise.reject('Unable to sign in at this time.')
        }
      })
  },

  updateUser: (update, signer) => {
    let userUpdate = pluck(update, 'username', 'old_password', 'password', 'encryptedPrivateKey')
    let updatedEncryptedKey = sjcl.encrypt(update.password, signer._privateKey.asHex())
    userUpdate.encryptedPrivateKey = updatedEncryptedKey
    let publicKey = update.public_key

    return m.request({
      method: 'PATCH',
      url: `api/users/${publicKey}`,
      data: userUpdate
    })
      .catch((e) => {
        if (e.error && e.errorStatus === 401) {
          return Promise.reject('Unauthorized change of password')
        } else {
          return Promise.reject('Unable to change password at this time.')
        }
      })
      .then((result) => {
        if (result.status === 'ok') {
          AuthService.updateUserData(userUpdate)
          displaySuccessDialog()
        }
      })
  },

  /**
     * Creates a user then submits a transaction to the blockchain
     *
     * The function is a (Signer) => Promise, where the promise is resolved when the transaction completes
     */
  createUser: (user, submitTransactionFn) => {
    let userCreate = pluck(user, 'username', 'password', 'email', 'name')
    return AuthService.createSigner(userCreate.password)
      .then(({ signer, encryptedPrivateKey }) => {
        userCreate.publicKey = signer.getPublicKey().asHex()
        userCreate.encryptedPrivateKey = encryptedPrivateKey
        userCreate.email = userCreate.email

        return m.request({
          method: 'POST',
          url: 'api/users',
          data: userCreate
        })
          .catch((e) => {
            return Promise.reject(JSON.parse(e.message).error)
          })
          .then((result) => {
            if (result.status === 'ok') {
              api.setAuth(result.authorization)
              return submitTransactionFn(signer)
                .catch((e) => Promise.reject(e))
            } else {
              return Promise.reject('Unable to sign up at this time.')
            }
          })
          .then(() => AuthService.setUserData(userCreate, userCreate.password))
      })
  }
}

module.exports = AuthService
