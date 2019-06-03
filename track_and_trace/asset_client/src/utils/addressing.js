const crypto = require("crypto")

const TNT_FAMILY_NAME = 'grid_track_and_trace'
const TNT_FAMILY_VERSION = '1.0'
const TNT_NAMESPACE = 'a43b46'

const PIKE_FAMILY_NAME = 'pike'
const PIKE_FAMILY_VERSION = '0.1'
const PIKE_NAMESPACE = 'cad11d'
const PIKE_AGENT_SUBSPACE = '00'
const PIKE_ORG_SUBSPACE = '01'

function hash(object, num) {
    let sha = crypto.createHash("sha512")
    return sha.update(object).digest("hex").substring(0, num)
}

module.exports = {
    getTntFamilyNamespacePrefix() {
        return TNT_NAMESPACE
    },
    makeAgentAddress(agentPublicKey) {
        return PIKE_NAMESPACE + PIKE_AGENT_SUBSPACE + hash(agentPublicKey, 62)
    },
    makeOrganizationAddress(organizationId) {
        return PIKE_NAMESPACE + PIKE_ORG_SUBSPACE + hash(organizationId, 62)
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
    agentAddressPrefix: PIKE_NAMESPACE + PIKE_AGENT_SUBSPACE,
    organizationAddressPrefix: PIKE_NAMESPACE + PIKE_ORG_SUBSPACE,
}