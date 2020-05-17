console.time('startup')
import CONFIG from 'config'
import beforeStartup from '@/lib/startup/before'
import afterStartup from '@/lib/startup/after'
import waitForCouchInit from '@/db/couch/init'
import initExpress from '@/init_express'
import { Log, Error } from '@/lib/utils/logs'

// Signal to other CONFIG consumers that they are in a server context
// and not simply scripts being executed in the wild
CONFIG.serverMode = true

beforeStartup()

// Starting to make CouchDB initialization checks
// Meanwhile, start setting up the server.
// Startup time is mostly due to the time needed to require
// all files from controllers, middlewares, libs, etc

waitForCouchInit()
.then(Log('couch init'))
.then(initExpress)
.then(() => console.timeEnd('startup'))
.then(afterStartup)
.catch(Error('init err'))

