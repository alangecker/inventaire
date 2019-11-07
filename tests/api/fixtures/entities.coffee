CONFIG = require 'config'
__ = CONFIG.universalPath
_ = __.require 'builders', 'utils'
{ authReq } = require '../utils/utils'
{ Promise } = __.require 'lib', 'promises'
isbn_ = __.require 'lib', 'isbn/isbn'
wdLang = require 'wikidata-lang'
{ getByUri, getByUris, addClaim } = require '../utils/entities'
faker = require 'faker'
someImageHash = '00015893d54f5112b99b41b0dfd851f381798047'

defaultEditionData = ->
  labels: {}
  claims:
    'wdt:P31': [ 'wd:Q3331189' ]
    'wdt:P1476': [ API.randomLabel() ]

createEntity = (P31)-> (params = {})->
  defaultLabel = if P31 is 'wd:Q5' then humanName() else API.randomLabel(4)
  labels = params.labels or { en: defaultLabel }
  authReq 'post', '/api/entities?action=create',
    labels: labels
    claims: { 'wdt:P31': [ P31 ] }

humanName = -> faker.fake '{{name.firstName}} {{name.lastName}}'
randomWords = (length)-> faker.random.words(length)

module.exports = API =
  createHuman: createEntity 'wd:Q5'
  createWork: createEntity 'wd:Q571'
  createSerie: createEntity 'wd:Q277759'
  createPublisher: createEntity 'wd:Q2085381'
  randomLabel: (length = 5)-> randomWords(length)
  humanName: humanName
  createWorkWithAuthor: (human, label)->
    humanPromise = if human then Promise.resolve(human) else API.createHuman()
    label or= API.randomLabel()

    humanPromise
    .then (human)->
      authReq 'post', '/api/entities?action=create',
        labels: { en: label }
        claims:
          'wdt:P31': [ 'wd:Q571' ]
          'wdt:P50': [ human.uri ]

  createEdition: (params = {})->
    { work, works, lang } = params
    lang or= 'en'
    if work? and not works? then works = [ work ]
    worksPromise = if works? then Promise.resolve(works) else API.createWork()

    worksPromise
    .then (works)->
      works = _.forceArray works
      worksUris = _.map works, 'uri'
      authReq 'post', '/api/entities?action=create',
        claims:
          'wdt:P31': [ 'wd:Q3331189' ]
          'wdt:P629': worksUris
          'wdt:P1476': [ _.values(works[0].labels)[0] ]
          'wdt:P1680': [ randomWords() ]
          'wdt:P407': [ 'wd:' + wdLang.byCode[lang].wd ]
          'wdt:P123': [ 'wd:Q3213930' ]
          'wdt:P577': [ '2019' ]
          'invp:P2': [ someImageHash ]

  createEditionFromWorks: (works...)->
    params = { works }
    API.createEdition params

  createWorkWithAuthorAndSerie: ->
    API.createWorkWithAuthor()
    .tap API.addSerie
    # Get a refreshed version of the work
    .then (work)-> getByUri work.uri

  createEditionWithWorkAuthorAndSerie: ->
    API.createWorkWithAuthorAndSerie()
    .then (work)-> API.createEdition { work }

  createItemFromEntityUri: (uri, data = {})->
    authReq 'post', '/api/items', _.extend({}, data, { entity: uri })

  ensureEditionExists: (uri, workData, editionData)->
    getByUris uri
    .get 'entities'
    .then (entities)->
      if entities[uri]? then return entities[uri]
      workData or= {
        labels: { fr: API.randomLabel() }
        claims: { 'wdt:P31': [ 'wd:Q571' ] }
      }
      authReq 'post', '/api/entities?action=create',
        labels: { de: humanName() }
        claims: { 'wdt:P31': [ 'wd:Q5' ] }
      .then (authorEntity)->
        workData.claims['wdt:P50'] = [ authorEntity.uri ]
        authReq 'post', '/api/entities?action=create', workData
      .then (workEntity)->
        editionData or= defaultEditionData()
        [ prefix, id ] = uri.split ':'
        if isbn_.isValidIsbn id
          editionData.claims['wdt:P212'] = [ isbn_.toIsbn13h(id) ]
        editionData.claims['wdt:P629'] = [ workEntity.uri ]
        authReq 'post', '/api/entities?action=create', editionData

  someImageHash: someImageHash

  someOpenLibraryId: (type = 'human')->
    numbers = Math.random().toString().slice(2, 7)
    typeLetter = openLibraryTypeLetters[type]
    return "OL1#{numbers}#{typeLetter}"

  someGoodReadsId: ->
    numbers = Math.random().toString().slice(2, 7)
    return "100000000#{numbers}"

  generateIsbn13: ->
    isbn = '9780' + _.join(_.sampleSize(_.split('0123456789', ''), 9), '')
    if isbn_.isValidIsbn(isbn) then return isbn
    API.generateIsbn13()

addEntityClaim = (createFnName, property)-> (subjectEntity)->
  subjectUri = if _.isString subjectEntity then subjectEntity else subjectEntity.uri
  API[createFnName]()
  .tap (entity)-> addClaim subjectUri, property, entity.uri

API.addAuthor = addEntityClaim 'createHuman', 'wdt:P50'
API.addSerie = addEntityClaim 'createSerie', 'wdt:P179'

openLibraryTypeLetters =
  edition: 'M'
  work: 'W'
  human: 'A'
