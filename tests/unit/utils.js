const { warn } = require('inv-loggers')
const util = require('util')

module.exports = {
  // A function to quickly fail when a test gets an undesired positive answer
  undesiredRes: done => res => {
    done(new Error('.then function was expected not to be called'))
    warn(util.inspect(res, false, null), 'undesired positive res')
  },

  undesiredErr: done => err => {
    done(err)
    warn(err.body || err, 'undesired err body')
  },

  shouldNotGetHere: res => {
    const err = new Error('function was expected not to be called')
    err.name = 'ShouldNotGetHere'
    err.context = { res }
    throw err
  },

  rethrowShouldNotGetHereErrors: err => {
    if (err.name === 'ShouldNotGetHere') throw err
  }
}
