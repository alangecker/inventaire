const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const couch_ = __.require('lib', 'couch')
const error_ = __.require('lib', 'error/error')
const assert_ = __.require('utils', 'assert_types')

const handlers = module.exports = {
  byEmail: (db, email) => {
    assert_.string(email)
    return db.viewByKey('byEmail', email.toLowerCase())
  },

  byEmails: (db, emails) => {
    assert_.strings(emails)
    return db.viewByKeys('byEmail', emails.map(_.toLowerCase))
  },

  findOneByEmail: (db, email) => {
    return handlers.byEmail(db, email)
    .then(couch_.firstDoc)
    .then(user => {
      if (user) return user
      else throw error_.notFound(email)
    })
  }
}
