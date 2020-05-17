import _ from 'lodash'
import * as loggers_ from 'inv-loggers'

const CONFIG = require('config')
const { offline, verbose } = CONFIG
const chalk = require('chalk')
const { grey, red } = chalk

let errorCounter = 0

// Log full objects
require('util').inspect.defaultOptions.depth = 20


const BaseLogger = (color, operation) => (obj, label) => {
  // fully display deep objects
  console.log(grey('****') + chalk[color](`${label}`) + grey('****'))
  console.log(operation(obj))
  console.log(grey('----------'))
  return obj
}

export const log = !verbose ? _.identity : loggers_.log


export const stringify = BaseLogger('yellow', JSON.stringify)

export function error(err, label, logStack = true) {
  if (!(err instanceof Error)) {
    throw new Error('invalid error object')
  }

  err = err as any // disable any type errors for err

  if (err._hasBeenLogged) return

  // If the error is of a lower lever than 500, make it a warning, not an error
  if ((err.statusCode != null) && (err.statusCode < 500)) {
    return warn(err, label)
  }

  // Prevent logging big error stack traces for network errors
  // in offline development mode
  if (offline && (err.code === 'ENOTFOUND')) {
    log(err.message, `${label} (offline)`, 'red')
    return
  }

  log(_.omit(err, 'stack'), label, 'red')
  if (logStack) {
    // Make the stack more readable
    err.stack = err.stack.split('\n')
    // Log the stack appart to make it be displayed with line breaks
    console.log(err.stack)
  }

  if (!err.labels) { err.labels = 'server' }

  err._hasBeenLogged = true
  errorCounter++
}

export function warn(err: any, label) {
  if (err._hasBeenLogged) return
  const url = err.context && err.context.url
  // Local 404 errors don't need to be logged, as they will be logged
  // by the request logger middleware and logging the error object is of no help,
  // everything is in the URL
  if (err.statusCode === 404 && url && url[0] === '/') return
  if (err instanceof Error) {
    // shorten the stack trace
    err.stack = err.stack.split('\n').slice(0, 3).join('\n')
  }

  loggers_.warn(err, label)

  if(typeof err !== 'string') err._hasBeenLogged = true
}

export const  errorCount = () => errorCounter

// logs the errors total if there was an error
// in the last 5 seconds
// -> just a convenience for debugging
export function logErrorsCount() {
  let prev = 0
  const counter = () => {
    if (errorCounter !== prev) {
      prev = errorCounter
      return console.log(red('errors: ') + errorCounter)
    }
  }
  setInterval(counter, 5000)
}


// The same as inv-loggers::errorRethrow but using customLoggers.error instead
const errorRethrow = (err, label) => {
  error(err, label)
  throw err
}

// Overriding inv-loggers partial loggers with the above customized loggers
export const Warn = loggers_.partialLogger(warn)

const ErrorLogger = loggers_.partialLogger(error)
export { ErrorLogger as Error }
export const ErrorRethrow = loggers_.partialLogger(errorRethrow)



// export missing inv-loggers methods

export const success = loggers_.success
export const info = loggers_.info
export const Log = loggers_.Log