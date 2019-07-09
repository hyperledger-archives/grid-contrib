const crypto = require('crypto')

const TNT_FAMILY_NAME = 'grid_track_and_trace'
const TNT_NAMESPACE = 'a43b46'
const TNT_RECORD_SUBSPACE = 'ec'
const TNT_PROPOSAL_SUBSPACE = 'aa'
const TNT_PROPERTY_SUBSPACE = 'ea'
const TNT_FAMILY_VERSION = '1.0'

const PIKE_FAMILY_NAME = 'pike'
const PIKE_FAMILY_VERSION = '0.1'
const PIKE_NAMESPACE = 'cad11d'
const PIKE_AGENT_SUBSPACE = '00'
const PIKE_ORG_SUBSPACE = '01'

const GRID_SCHEMA_FAMILY_NAME = 'grid_schema'
const GRID_SCHEMA_FAMILY_VERSION = '1.0'
const GRID_NAMESPACE = '621dee'
const GRID_SCHEMA_SUBSPACE = '01'

const SABRE_FAMILY_NAME = 'sabre'
const SABRE_FAMILY_VERSION = '0.4'
const SABRE_NAMESPACE_REGISTRY_PREFIX = '00ec00'
const SABRE_CONTRACT_REGISTRY_PREFIX = '00ec01'
const SABRE_CONTRACT_PREFIX = '00ec02'

function hash (object, num) {
  let sha = crypto.createHash('sha512')
  return sha.update(object).digest('hex').substring(0, num)
}

function encodePage (page) {
  return page.toString(16).padStart(4, '0')
}

module.exports = {
  computeContractRegistryAddresses (families) {
    return families.map((family) => SABRE_CONTRACT_REGISTRY_PREFIX +
        hash(family.name, 64))
  },
  computeContractAddresses (families) {
    return families.map((family) => SABRE_CONTRACT_PREFIX +
        hash(family.name + ',' + family.version, 64))
  },
  computeContractRegistryAddress (name) {
    return SABRE_CONTRACT_REGISTRY_PREFIX +
        hash(name, 64)
  },
  computeContractAddress (name, version) {
    return SABRE_CONTRACT_PREFIX +
        hash(name + ',' + version, 64)
  },
  computeNamespaceRegistryAddress (namespace) {
    let prefix = namespace.substring(0, 6)
    return SABRE_NAMESPACE_REGISTRY_PREFIX +
        hash(prefix, 64)
  },
  makeAgentAddress (agentPublicKey) {
    return PIKE_NAMESPACE + PIKE_AGENT_SUBSPACE +
        hash(agentPublicKey, 62)
  },
  makeOrganizationAddress (organizationId) {
    return PIKE_NAMESPACE + PIKE_ORG_SUBSPACE +
        hash(organizationId, 62)
  },
  makeSchemaAddress (schemaName) {
    return GRID_NAMESPACE + GRID_SCHEMA_SUBSPACE +
        hash(schemaName, 62)
  },
  makeRecordAddress (recordId) {
    return TNT_NAMESPACE + TNT_RECORD_SUBSPACE + hash(recordId, 62)
  },
  makePropertyAddresses (recordId, propertyNames) {
    return propertyNames.map((name) => TNT_NAMESPACE + TNT_PROPERTY_SUBSPACE +
        hash(recordId, 36) +
        hash(name, 22) + '0000')
  },
  makePropertyPageAddresses (recordId, propertyNames, currentPage) {
    return propertyNames.map((name) => TNT_NAMESPACE + TNT_PROPERTY_SUBSPACE +
        hash(recordId, 36) +
        hash(name, 22) + encodePage(currentPage))
  },
  makeProposalAddress (recordId, receivingAgent) {
    return TNT_NAMESPACE + TNT_PROPOSAL_SUBSPACE +
        hash(recordId, 36) +
        hash(receivingAgent, 26)
  },
  pikeFamily: {
    name: PIKE_FAMILY_NAME,
    version: PIKE_FAMILY_VERSION,
    namespace: PIKE_NAMESPACE
  },
  tntFamily: {
    name: TNT_FAMILY_NAME,
    version: TNT_FAMILY_VERSION,
    namespace: TNT_NAMESPACE
  },
  gridSchemaFamily: {
    name: GRID_SCHEMA_FAMILY_NAME,
    version: GRID_SCHEMA_FAMILY_VERSION,
    namespace: GRID_NAMESPACE
  },
  sabreFamily: {
    name: SABRE_FAMILY_NAME,
    version: SABRE_FAMILY_VERSION
  }
}
