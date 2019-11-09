# A module to look for works labels occurrences in an author's external databases reference.

__ = require('config').universalPath
_ = __.require 'builders', 'utils'
promises_ = __.require 'lib', 'promises'
error_ = __.require 'lib', 'error/error'
assert_ = __.require 'utils', 'assert_types'
getWikipediaArticle = __.require 'data', 'wikipedia/get_article'
getBnfAuthorWorksTitles = __.require 'data', 'bnf/get_bnf_author_works_titles'
getBnbAuthorWorksTitles = __.require 'data', 'bnb/get_bnb_author_works_titles'
getBneAuthorWorksTitles = __.require 'data', 'bne/get_bne_author_works_titles'
getSelibrAuthorWorksTitle = __.require 'data', 'selibr/get_selibr_author_works_titles'
getKjkAuthorWorksTitle = __.require 'data', 'kjk/get_kjk_author_works_titles'
getNdlAuthorWorksTitle = __.require 'data', 'ndl/get_ndl_author_works_titles'
getOlAuthorWorksTitles = __.require 'data', 'openlibrary/get_ol_author_works_titles'
getEntityByUri = require './get_entity_by_uri'
{ normalizeTerm } = require './terms_normalization'

# - worksLabels: labels from works of an author suspected
#   to be the same as the wdAuthorUri author
# - worksLabelsLangs: those labels language, indicating which Wikipedia editions
#   should be checked
module.exports = (wdAuthorUri, worksLabels, worksLabelsLangs)->
  assert_.string wdAuthorUri
  assert_.strings worksLabels
  assert_.strings worksLabelsLangs

  # get Wikipedia article title from URI
  getEntityByUri { uri: wdAuthorUri }
  .then (authorEntity)->
    # Known case: entities tagged as 'missing' or 'meta'
    unless authorEntity.sitelinks? then return []

    promises_.all [
      getWikipediaOccurrences authorEntity, worksLabels, worksLabelsLangs
      getBnfOccurrences authorEntity, worksLabels
      getOpenLibraryOccurrences authorEntity, worksLabels
      getBnbOccurrences authorEntity, worksLabels
      getBneOccurrences authorEntity, worksLabels
      getSelibrOccurrences authorEntity, worksLabels
      getKjkOccurrences authorEntity, worksLabels
      getNdlOccurrences authorEntity, worksLabels
    ]
  .then _.flatten
  .then _.compact
  .catch (err)->
    _.error err, 'has works labels occurrence err'
    return []

getWikipediaOccurrences = (authorEntity, worksLabels, worksLabelsLangs)->
  promises_.all getMostRelevantWikipediaArticles(authorEntity, worksLabelsLangs)
  .map createOccurrencesFromUnstructuredArticle(worksLabels)

getMostRelevantWikipediaArticles = (authorEntity, worksLabelsLangs)->
  { sitelinks, originalLang } = authorEntity

  return _.uniq worksLabelsLangs.concat([ originalLang, 'en' ])
  .map (lang)->
    title = sitelinks["#{lang}wiki"]
    if title? then return { lang, title }
  .filter _.identity
  .map getWikipediaArticle

getAndCreateOccurrencesFromIds = (prop, getWorkTitlesFn)-> (authorEntity, worksLabels)->
  # An author should normally have only 1 value per external id property
  # but if there are several, check every available ids
  ids = authorEntity.claims[prop]
  unless ids? then return
  promises_.all ids.map(getWorkTitlesFn)
  .then _.flatten
  .map createOccurrencesFromExactTitles(worksLabels)

getBnfOccurrences = getAndCreateOccurrencesFromIds 'wdt:P268', getBnfAuthorWorksTitles
getOpenLibraryOccurrences = getAndCreateOccurrencesFromIds 'wdt:P648', getOlAuthorWorksTitles
getBnbOccurrences = getAndCreateOccurrencesFromIds 'wdt:P5361', getBnbAuthorWorksTitles
getBneOccurrences = getAndCreateOccurrencesFromIds 'wdt:P950', getBneAuthorWorksTitles
getSelibrOccurrences = getAndCreateOccurrencesFromIds 'wdt:P906', getSelibrAuthorWorksTitle
getKjkOccurrences = getAndCreateOccurrencesFromIds 'wdt:P1006', getKjkAuthorWorksTitle
getNdlOccurrences = getAndCreateOccurrencesFromIds 'wdt:P349', getNdlAuthorWorksTitle

createOccurrencesFromUnstructuredArticle = (worksLabels)->
  worksLabelsPattern = new RegExp(worksLabels.join('|'), 'gi')
  return (article)->
    matchedTitles = _.uniq article.extract.match(worksLabelsPattern)
    unless matchedTitles.length > 0 then return
    return { url: article.url, matchedTitles, structuredDataSource: false }

createOccurrencesFromExactTitles = (worksLabels)-> (result)->
  title = normalizeTerm result.title
  if title in worksLabels
    return { url: result.url, matchedTitles: [ title ], structuredDataSource: true }
  else
    return
