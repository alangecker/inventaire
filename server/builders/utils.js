const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = require('lodash')
const server_ = __.require('utils', 'base')
const logs_ = __.require('utils', 'logs')(_)
const booleanValidations_ = __.require('lib', 'boolean_validations')

module.exports = Object.assign(_, server_, logs_, booleanValidations_)
