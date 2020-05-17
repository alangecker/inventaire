import CONFIG from 'config'
import express from 'express'
import _ from '@/builders/utils'

const { env, port, host, name } = CONFIG

const middlewares = require('./middlewares/middlewares')
const middlewaresList = middlewares.common.concat((middlewares[env] || []))

const routes = require('./controllers/routes')

const app = express()

for (const middleware of middlewaresList) {
  if (_.isArray(middleware)) {
    app.use.apply(app, middleware)
  } else {
    app.use(middleware)
  }
}

for (const endpoint in routes) {
  const controllers = routes[endpoint]
  for (const verb in controllers) {
    const controller = controllers[verb]
    app[verb](`/${endpoint}`, controller)
  }
}

// Should be used after all middlewares and routes
// cf http://expressjs.com/fr/guide/error-handling.html
app.use(require('./middlewares/error_handler'))

app.disable('x-powered-by')

export default function init_express() {
  return new Promise((resolve, reject) => {
    app.listen(port, host, err => {
      if (err) {
        reject(err)
      } else {
        _.info(`${name} server is listening on port ${port}...`)
        resolve(app)
      }
    })
  })
}
