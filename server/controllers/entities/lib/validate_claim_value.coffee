__ = require('config').universalPath
_ = __.require 'builders', 'utils'
error_ = __.require 'lib', 'error/error'
promises_ = __.require 'lib', 'promises'

# Working around circular dependencies
getEntityByUri = null
entities_ = null
lateRequire = ->
  getEntityByUri = require './get_entity_by_uri'
  entities_ = require './entities'
setTimeout lateRequire, 0

properties = require './properties/properties_values_constraints'
{ validateValueType, propertyType } = require './properties/validations'
validateClaimValueSync = require './validate_claim_value_sync'

module.exports = (params)->
  # Always return a promise
  promises_.try -> validateClaimValue params

validateClaimValue = (params)->
  { type, currentClaims, property, oldVal, newVal, letEmptyValuePass, isWdEntity, userIsAdmin } = params
  # letEmptyValuePass to let it be interpreted as a claim deletion
  if letEmptyValuePass and not newVal? then return null

  prop = properties[property]

  # If no old value is passed, it's a claim creation, not an update
  updatingValue = oldVal?

  # Ex: a user can freely set a wdt:P31 value, but only an admin can change it
  if updatingValue and prop.adminUpdateOnly and not userIsAdmin
    throw error_.new "updating property requires admin's rights", 403, property, newVal

  validateClaimValueSync property, newVal, type

  # If the property expects a uniqueValue and that there is already a value defined
  # any action other than editing the current value should be rejected
  if prop.uniqueValue
    propArray = currentClaims[property]
    if propArray?.length > 0 and oldVal isnt propArray[0]
      throw error_.new 'this property accepts only one value', 400, arguments

  formattedValue = if prop.format? then prop.format(newVal) else newVal

  { concurrency, restrictedType } = prop

  # Disable concurrency checks for claims being made on Wikidata entities
  # as the only current case is when we move an Inventaire entity to Wikidata
  # in which case the concurrency check will fail as the property value
  # is already used by the entity currently in Inventaire itself
  if isWdEntity then concurrency = false

  # Resolve only if all async tests pass
  return promises_.all [
    verifyClaimConcurrency concurrency, property, formattedValue
    verifyClaimEntityType restrictedType, formattedValue
  ]
  .then -> formattedValue

# For properties that don't tolerate having several entities
# sharing the same value
verifyClaimConcurrency = (concurrency, property, value)->
  unless concurrency then return
  entities_.byClaim property, value
  .then (res)->
    if res.rows.length > 0
      # /!\ The client relies on this exact message
      # client/app/modules/entities/lib/creation_partials.coffee
      message = 'this property value is already used'
      entity = 'inv:' + res.rows[0].id
      # /!\ The client relies on the entity being passed in the context
      throw error_.new message, 400, { entity, property, value }

# For claims that have an entity URI as value
# check that the target entity is of the expected type
verifyClaimEntityType = (restrictedType, value)->
  unless restrictedType? then return

  getEntityByUri { uri: value }
  .then (entity)->
    unless entity.type is restrictedType
      throw error_.new "invalid claim entity type: #{entity.type}", 400, value
