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
const { inputField } = require('../components/forms')
const authService = require('../services/auth')
const organizationService = require('../services/organizations')

const GetStarted = {
  submitting: false,
  error: null,

  org_id: '',
  org_name: '',
  org_address: '',

  email: '',
  password: '',
  passwordConfirm: '',

  setOrgId: (value) => {
    GetStarted.org_id = value
  },

  setOrgName: (value) => {
    GetStarted.org_name = value
  },

  setOrgAddress: (value) => {
    GetStarted.org_address = value
  },

  setEmail: (value) => {
    GetStarted.email = value
  },

  setPassword: (value) => {
    GetStarted.password = value
  },

  setPasswordConfirm: (value) => {
    GetStarted.passwordConfirm = value
  },

  submit: () => {
    GetStarted.submitting = true
    authService.createUser(GetStarted, (signer) => organizationService.createOrganization(GetStarted.org_id, GetStarted.org_name, GetStarted.org_address, signer))
      .then(() => {
        GetStarted.clear()
        m.route.set('/')
      })
      .catch((e) => {
        GetStarted.error = e
        GetStarted.submitting = false
        m.redraw()
      })
  },

  clear: () => {
    GetStarted.submitting = false
    GetStarted.error = null

    GetStarted.org_id = ''
    GetStarted.org_name = ''
    GetStarted.org_address = ''
    GetStarted.email = ''
    GetStarted.password = ''
    GetStarted.passwordConfirm = ''
  },

  invalid: () => {
    if (!GetStarted.org_id ||
            !GetStarted.org_name ||
            !GetStarted.org_address ||
            !GetStarted.email ||
            !GetStarted.password ||
            !GetStarted.passwordConfirm ||
            GetStarted.password !== GetStarted.passwordConfirm) {
      return true
    }

    return false
  }
}

/**
 * Get Started Form
 */
const GetStartedForm = {
  oninit () {
    GetStarted.clear()
  },
  view () {
    return [
      m('.get-started-form'),
      m('form', [
        GetStarted.error ? m('p.text-danger', GetStarted.error) : null,
        m('legend', 'Get Started'),
        inputField('org-id', 'Organization ID', GetStarted.org_id, GetStarted.setOrgId),
        inputField('org-name', 'Organization Name', GetStarted.org_name, GetStarted.setOrgName),
        inputField('org-address', 'Organization Address', GetStarted.org_address, GetStarted.setOrgAddress),

        inputField('email', 'Email', GetStarted.email, GetStarted.setEmail),
        inputField('password', 'Password', GetStarted.password, GetStarted.setPassword, 'password'),
        inputField('password-confirm', 'Confirm Password', GetStarted.passwordConfirm, GetStarted.setPasswordConfirm, 'password'),

        m('.form-group',
          m('.row.justify-content-end.align-items-end',
            m('.col-2',
              m('button.btn.btn-primary',
                {
                  onclick: GetStarted.submit,
                  disabled: GetStarted.submitting || GetStarted.invalid()
                }, 'Submit'))))
      ])
    ]
  }
}

module.exports = GetStartedForm
