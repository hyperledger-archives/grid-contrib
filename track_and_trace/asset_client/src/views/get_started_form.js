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
        GetStarted.submitting = true,
        authService.createUser(GetStarted, (signer) => organizationService.createOrganization(GetStarted.org_id, GetStarted.org_name, GetStarted.org_address, signer))
            .then(() => {
                GetStarted.clear()
                m.route.set('/')
            })
            .catch((e) => {
                console.error(e)
                GetStarted.submitting = false
                GetStarted.error = e
            })
    },

    clear: () => {
        GetStarted.submitting = false,
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
    oninit() {
        GetStarted.clear()
    },
    view() {
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
                                        disabled: GetStarted.submitting || GetStarted.invalid(),
                                    }, 'Submit'))))
                ])
        ]
    }
}

module.exports = GetStartedForm
