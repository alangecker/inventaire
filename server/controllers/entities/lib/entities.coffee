__ = require('config').universalPath
_ = __.require 'builders', 'utils'
db = __.require('couch', 'base')('entities')
promises_ = __.require 'lib', 'promises'
error_ = __.require 'lib', 'error/error'
Entity = __.require 'models', 'entity'
patches_ = require './patches'
books_ = __.require 'lib', 'books'

{ properties, validateProperty, testDataType } = require './properties'

module.exports =
  db: db
  byId: db.get.bind(db)

  byIds: (ids)->
    ids = _.forceArray ids
    db.fetch ids
    .then _.compact
    .then _.Log('getEntities')

  byIsbn: (isbn)->
    isbn = books_.normalizeIsbn isbn
    P = if isbn.length is 13 then 'P212' else 'P957'
    db.viewFindOneByKey 'byClaim', [P, isbn]

  create: ->
    # Create a new entity doc.
    # This constituts the basis on which next modifications patch
    db.postAndReturn Entity.create()
    .then _.Log('created doc')

  edit: (userId, updatedLabels, updatedClaims, currentDoc)->
    updatedDoc = _.cloneDeep currentDoc
    updatedDoc = Entity.addLabels updatedDoc, updatedLabels
    updatedDoc = Entity.addClaims updatedDoc, updatedClaims
    db.putAndReturn updatedDoc
    .tap -> patches_.create userId, currentDoc, updatedDoc

  createClaim: (doc, property, value, userId)->
    promises_.try -> validateProperty property
    .then -> validateClaimValue property, value
    .then (formattedValue)-> Entity.createClaim(doc, property, formattedValue)
    .then _.Log('updated doc')
    .then db.putAndReturn
    .tap patches_.create.bind(null, userId, doc)
    .tap -> patches_.create userId, currentDoc, updatedDoc

  validateClaim: (property, value)->
    promises_.try -> validateProperty property
    .then -> validateClaimValue property, value

validateClaimValue = (property, value)->
  unless testDataType property, value
    return error_.reject 'invalid value datatype', 400, property, value

  prop = properties[property]
  unless prop.test value
    return error_.reject 'invalid property value', 400, property, value

  formattedValue = prop.format value

  unless prop.concurrency then return promises_.resolve formattedValue

  verifyExisting property, formattedValue
  .then -> formattedValue

verifyExisting = (property, value)->
  # using viewCustom as there is no need to include docs
  db.viewCustom 'byClaim', { key: [property, value] }
  .then (docs)->
    if docs.length isnt 0
      throw error_.new 'this property value already exist', 400, property, value
