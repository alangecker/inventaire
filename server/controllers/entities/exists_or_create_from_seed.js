// An endpoint to take advantage of data we are given through data imports
// instead of relying on dataseed
const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
let error_ = __.require('lib', 'error/error')
const promises_ = __.require('lib', 'promises')
const responses_ = __.require('lib', 'responses')
const sanitize = __.require('lib', 'sanitize/sanitize')
error_ = __.require('lib', 'error/error')
const entities_ = require('./lib/entities')
const scaffoldFromSeed = require('./lib/scaffold_entity_from_seed/edition')
const { enabled: dataseedEnabled } = CONFIG.dataseed
const dataseed = __.require('data', 'dataseed/dataseed')
const formatEditionEntity = require('./lib/format_edition_entity')

const sanitization = {
  isbn: {},
  title: {},
  authors: { optional: true }
}

module.exports = (req, res) => {
  sanitize(req, res, sanitization)
  .then(seed => {
    const { isbn } = seed
    const authors = seed.authors || []

    seed.authors = authors.filter(_.isNonEmptyString)

    return entities_.byIsbn(isbn)
    .then(findOrCreateEntity(seed))
    .then(formatEditionEntity)
    .then(responses_.Send(res))
  })
  .catch(error_.Handler(req, res))
}

const findOrCreateEntity = seed => entityDoc => {
  return entityDoc || addImage(seed).then(scaffoldFromSeed)
}

const addImage = seed => {
  if (!dataseedEnabled) return promises_.resolve(seed)

  // Try to find an image from the seed ISBN
  return dataseed.getImageByIsbn(seed.isbn)
  .then(res => {
    if (res.url) {
      seed.image = res.url
      return seed
    } else {
      const { image } = seed
      if (image == null) return seed

      // Else, if an image was provided in the seed, try to use it
      return dataseed.getImageByUrl(seed.image)
      .then(res2 => {
        if (res.url) seed.image = res2.url
        else delete seed.image
        return seed
      })
    }
  })
  .catch(err => {
    _.error(err, 'add image err')
    return seed
  })
}
