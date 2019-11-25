// keep in sync the users database and the geo index
const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const follow = __.require('lib', 'follow')
const dbBaseName = 'users'

module.exports = db => {
  const filter = doc => {
    if (doc.type === 'user') {
      if (doc.position != null) return true
    }
    return false
  }

  const updatePosition = change => {
    const { id, deleted, doc } = change
    const { position } = doc

    if (deleted) {
      return db.del(id)
    } else {
      const [ lat, lon ] = Array.from(position)
      // Most of the user doc change wont imply a position change
      // so it should make sense to get the doc to check the need to write
      return db.getByKey(id)
      .catch(err => {
        if (err.notFound) return null
        else throw err
      })
      .then(updateIfNeeded.bind(null, id, lat, lon))
      .catch(_.Error('user geo updatePosition err'))
    }
  }

  const updateIfNeeded = (id, lat, lon, res) => {
    if (res != null) {
      const { position } = res
      if ((lat === position.lat) && (lon === position.lon)) return
    }

    return db.put({ lat, lon }, id, null)
  }

  const reset = () => {
    _.log(`reseting ${dbBaseName} geo index`, null, 'yellow')
    return db.reset()
  }

  return follow({ dbBaseName, filter, onChange: updatePosition, reset })
}