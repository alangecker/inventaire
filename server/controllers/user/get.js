const CONFIG = require('config')
const __ = CONFIG.universalPath
const error_ = __.require('lib', 'error/error')
const { ownerSafeData } = require('./lib/authorized_user_data_pickers')

module.exports = (req, res) => {
  if (req.user) res.json(ownerSafeData(req.user))
  else error_.unauthorizedApiAccess(req, res)
}