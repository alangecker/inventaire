__ = require('config').universalPath
_ = __.require 'builders', 'utils'
promises_ = __.require 'lib', 'promises'
error_ = __.require 'lib', 'error/error'
qs = require 'querystring'
cache_ = __.require 'lib', 'cache'

module.exports = (params)->
  { lang, title, introOnly } = params
  keyBase = if introOnly then 'wpextract' else 'wparticle'
  key = "#{keyBase}:#{lang}:#{title}"
  return cache_.get key, getArticle.bind(null, lang, title, introOnly)

getArticle = (lang, title, introOnly)->
  promises_.get apiQuery(lang, title, introOnly)
  .then (res)->
    { pages } = res.query
    unless pages?
      throw error_.new 'invalid extract response', 500, arguments, res.query

    return {
      quotation: cleanExtract _.values(pages)?[0]?.extract
      url: "https://#{lang}.wikipedia.org/wiki/#{title}"
    }

apiQuery = (lang, title, introOnly)->
  title = qs.escape title

  # doc:
  # - https://en.wikipedia.org/w/api.php?action=help&modules=query
  # - https://www.mediawiki.org/wiki/Extension:TextExtracts
  queryObj =
    format: 'json'
    action: 'query'
    titles: title
    prop: 'extracts'
    # Return the article as plain text instead of html
    explaintext: true

  # Set exintro only if introOnly is true as any value
  # will be interpreted as true
  if introOnly then queryObj.exintro = true

  return _.buildPath "https://#{lang}.wikipedia.org/w/api.php", queryObj

# Commas between references aren't removed, thus the presence of aggregated commas
cleanExtract = (str)-> str?.replace(/,,/g, ',').replace /,\./g, '.'
