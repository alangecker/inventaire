const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const promises_ = __.require('lib', 'promises')
const User = __.require('models', 'user')
const isReservedWord = require('./is_reserved_word')
const error_ = __.require('lib', 'error/error')

// Working around circular dependencies
let user_
const lateRequire = () => { user_ = require('./user') }
setTimeout(lateRequire, 0)

module.exports = {
  username: (username, currentUsername) => {
    // If a currentUsername is provided
    // return true if the new username is the same but with a different case
    // (used for username update)
    if (currentUsername) {
      if (username.toLowerCase() === currentUsername.toLowerCase()) {
        return promises_.resolved
      }
    }

    if (!User.validations.username(username)) {
      return error_.rejectInvalid('username', username)
    }

    if (isReservedWord(username)) {
      return error_.reject("reserved words can't be usernames", 400, username)
    }

    return user_.byUsername(username)
    .then(checkAvailability.bind(null, username, 'username'))
  },

  email: email => {
    if (!User.validations.email(email)) {
      return error_.rejectInvalid('email', email)
    }

    return user_.byEmail(email)
    .then(checkAvailability.bind(null, email, 'email'))
  }
}

const checkAvailability = (value, label, docs) => {
  if (docs.length !== 0) {
    throw error_.new(`this ${label} is already used`, 400, value)
  }

  _.success(value, 'available')
  return value
}
