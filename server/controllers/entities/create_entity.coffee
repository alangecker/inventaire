__ = require('config').universalPath
_ = __.require 'builders', 'utils'
error_ = __.require 'lib', 'error/error'
entities_ = require './lib/entities'
{ Lang } = __.require 'models', 'tests/regex'
promises_ = __.require 'lib', 'promises'

module.exports = (req, res) ->
  { body:entityData } = req

  unless _.isNonEmptyPlainObject entityData
    return error_.bundle res, 'bad query', 400

  { _id:userId } = req.user

  _.log entityData, 'entityData'

  { labels, claims } = entityData

  promises_.try -> validateLabels labels
  .then -> validateClaims claims
  .then -> entities_.create entityData, userId
  .then entities_.edit.bind(null, userId, labels, claims)
  .then res.json.bind(res)
  .catch error_.Handler(res)


validateLabels = (labels)->
  unless _.isNonEmptyPlainObject labels
    throw error_.new "invalid labels", 400, labels

  for lang, value of labels
    unless Lang.test lang
      throw error_.new "invalid label language: #{lang}", 400, labels

    unless _.isNonEmptyString value
      throw error_.new "invalid label value: #{value}", 400, labels

validateClaims = (claims)->
  unless _.isNonEmptyPlainObject claims
    return error_.reject "invalid claims", 400, labels

  promises = []

  for prop, array of claims
    for value in array
      promises.push entities_.validateClaim(prop, value)

  return promises_.all promises
