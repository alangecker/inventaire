const CONFIG = require('config')
const __ = CONFIG.universalPath
const assert_ = __.require('utils', 'assert_types')
const { rawSubDb, Reset, streamPromise } = require('./base')
const geo = require('level-geospatial')
const promises_ = __.require('lib', 'promises')
const memoize = __.require('lib', 'utils/memoize')

module.exports = memoize(dbName => {
  const sub = rawSubDb(dbName)
  const db = geo(sub)
  const API = promises_.promisify(db, [ 'get', 'getByKey', 'put', 'del' ])
  API.reset = Reset(sub)
  API.search = Search(db)
  return API
})

const Search = db => (latLng, kmRange) => {
  assert_.array(latLng)
  assert_.number(kmRange)
  const [ lat, lon ] = latLng
  return streamPromise(db.search({ lat, lon }, kmRange * 1000))
}
