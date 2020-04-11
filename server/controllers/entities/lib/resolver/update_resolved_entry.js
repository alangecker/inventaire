const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const entities_ = require('../entities')

module.exports = ({ reqUserId, batchId }) => entry => {
  const { edition, works, authors } = entry

  const allResolvedSeeds = [ edition ].concat(works, authors).filter(hasUri)

  return Promise.all(allResolvedSeeds.map(updateEntityFromSeed(reqUserId, batchId)))
  .then(() => entry)
}

const hasUri = seed => seed.uri != null

const updateEntityFromSeed = (reqUserId, batchId) => seed => {
  const { uri, claims: seedClaims } = seed
  if (!uri) return

  const [ prefix, entityId ] = uri.split(':')
  // Do not try to update Wikidata for the moment
  if (prefix === 'wd') return

  return getEntity(prefix, entityId)
  .then(addMissingClaims(seedClaims, reqUserId, batchId))
}

const getEntity = (prefix, entityId) => {
  if (prefix === 'isbn') {
    return entities_.byIsbn(entityId)
  } else {
    return entities_.byId(entityId)
  }
}

const addMissingClaims = (seedClaims, reqUserId, batchId) => entity => {
  // Do not update if property already exists
  // Known cases: avoid updating authors who are actually edition translators
  const newClaims = _.omit(seedClaims, Object.keys(entity.claims))
  if (_.isEmpty(newClaims)) return
  return entities_.addClaims(reqUserId, newClaims, entity, batchId)
}
