const __ = require('config').universalPath
const _ = __.require('builders', 'utils')
const error_ = __.require('lib', 'error/error')
const responses_ = __.require('lib', 'responses')
const getEntitiesByUris = require('./lib/get_entities_by_uris')
const mergeEntities = require('./lib/merge_entities')
const radio = __.require('lib', 'radio')
const sanitize = __.require('lib', 'sanitize/sanitize')

const sanitization = {
  from: {},
  to: {}
}

// Assumptions:
// - ISBN are already desambiguated and should thus never need merge
//   out of the case of merging with an existing Wikidata edition entity
//   but those are ignored for the moment: not enough of them, data mixed with works, etc.
// - The merged entity data may be lost: the entity was probably a placeholder
//   what matters the most is the redirection. Or more fine, reconciling strategy can be developed later

// Only inv entities can be merged yet
const validFromUriPrefix = [ 'inv', 'isbn' ]

module.exports = (req, res) => {
  sanitize(req, res, sanitization)
  .then(params => {
    const { from: fromUri, to: toUri, reqUserId } = params
    const [ fromPrefix ] = fromUri.split(':')

    if (!validFromUriPrefix.includes(fromPrefix)) {
      // 'to' prefix doesn't need validation as it can be anything
      const message = `invalid 'from' uri domain: ${fromPrefix}. Accepted domains: ${validFromUriPrefix}`
      return error_.bundle(req, res, message, 400, params)
    }

    _.log({ merge: params, user: reqUserId }, 'entity merge request')

    return getMergeEntities(fromUri, toUri)
    .tap(filterEntities(fromUri, toUri))
    .tap(filterByType)
    .then(merge(reqUserId, fromUri, toUri))
    .tap(() => radio.emit('entity:merge', fromUri, toUri))
    .then(responses_.Ok(res))
  })
  .catch(error_.Handler(req, res))
}

const getMergeEntities = (fromUri, toUri) => {
  return getEntitiesByUris({ uris: [ fromUri, toUri ], refresh: true })
  .then(res => {
    const { entities, redirects } = res
    const fromEntity = getMergeEntity(entities, redirects, fromUri)
    const toEntity = getMergeEntity(entities, redirects, toUri)
    return { fromEntity, toEntity }
  })
}

const getMergeEntity = (entities, redirects, uri) => {
  return entities[uri] || entities[redirects[uri]]
}

const filterEntities = (fromUri, toUri) => entities => {
  const { fromEntity, toEntity } = entities
  filterEntity(fromEntity, fromUri, 'from')
  filterEntity(toEntity, toUri, 'to')
  if (fromEntity.uri === toEntity.uri) {
    throw error_.new("can't merge an entity into itself", 400, { fromUri, toUri })
  }
}

const filterEntity = (entity, originalUri, label) => {
  if (entity == null) {
    throw error_.new(`'${label}' entity not found`, 400, originalUri)
  }
  if (entity.uri !== originalUri) {
    throw error_.new(`'${label}' entity is already a redirection`, 400, { entity, originalUri })
  }
}

const filterByType = entities => {
  const { fromEntity, toEntity } = entities
  const { uri: fromUri } = fromEntity
  const { uri: toUri } = toEntity

  if (fromEntity.type !== toEntity.type) {
    // Exception: authors can be organizations and collectives of all kinds
    // which will not get a 'human' type
    if ((fromEntity.type !== 'human') || !(toEntity.type == null)) {
      const message = `type don't match: ${fromEntity.type} / ${toEntity.type}`
      throw error_.new(message, 400, fromUri, toUri)
    }
  }

  // Merging editions with ISBNs should only happen in the rare case
  // where the uniqueness check failed because two entities with the same ISBN
  // were created at about the same time. Other cases should be rejected.
  if (fromEntity.type === 'edition') {
    const fromEntityIsbn = fromEntity.claims['wdt:P212'] != null ? fromEntity.claims['wdt:P212'][0] : undefined
    const toEntityIsbn = toEntity.claims['wdt:P212'] != null ? toEntity.claims['wdt:P212'][0] : undefined
    if ((fromEntityIsbn != null) && (toEntityIsbn != null) && (fromEntityIsbn !== toEntityIsbn)) {
      throw error_.new("can't merge editions with different ISBNs", 400, fromUri, toUri)
    }
  }
}

const merge = (reqUserId, fromUri, toUri) => entities => {
  const { fromEntity, toEntity } = entities

  fromUri = replaceIsbnUriByInvUri(fromUri, fromEntity._id)
  toUri = replaceIsbnUriByInvUri(toUri, toEntity._id)

  return mergeEntities(reqUserId, fromUri, toUri)
}

const replaceIsbnUriByInvUri = (uri, invId) => {
  const [ prefix ] = uri.split(':')
  // Prefer inv id over isbn to prepare for ./lib/merge_entities
  if (prefix === 'isbn') return `inv:${invId}`
  return uri
}
