/**
 * Copyright 2017 Intel Corporation
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

const Dashboard = {
  view (vnode) {
    return [
      m('.header.text-center.mb-4',
        m('h4', 'Welcome To'),
        m('h1.mb-3', 'AssetTrack'),
        m('h5',
          m('em',
            'Powered by ',
            m('img.powered-by', {src: '../images/hyperledger.svg'})))),
      m('.blurb',
        m('p',
        m('em', 'AssetTrack'),
          ' provides an example of some of the capabilities of Hyperledger ',
          'Grid, and demonstrates the use of the Pike, Track and Trace, and ',
          'Grid Schema smart contracts. The contracts are deployed to Grid ',
          'using the Sabre transaction processor. AssetTrack ',
          'allows generic assets to be added to the blockchain and ',
          'tracked throughout their life cycle. As the ownership and location ',
          'of the asset changes, these updates are submitted to the ',
          'distributed ledger, providing an immutable and auditable ',
          'history of the asset.'),
        m('p',
          'To use ',
          m('em', 'AssetTrack'),
          ', create an account using the "Get Started" link in the navbar ',
          'above. Once logged in, you will be able to add new assets to ',
          'the blockchain and track them with data like weight or ',
          'location. You will be able to authorize other "agents" on the ',
          'blockchain to track this data as well, or even transfer ',
          'ownership or custodianship of the asset entirely. For the ',
          'adventurous, these actions can also be accomplished directly ',
          'with REST APIs running alongside the client, perfect for ',
          'automated IoT sensors.'))
    ]
  }
}

module.exports = Dashboard
