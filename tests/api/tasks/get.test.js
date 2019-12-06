const CONFIG = require('config')
const __ = CONFIG.universalPath
require('should')
const { undesiredErr } = __.require('apiTests', 'utils/utils')
const { createHuman } = require('../fixtures/entities')
const { getByScore, getBySuspectUris, getBySuggestionUris, update } = require('../utils/tasks')
const { createTask } = require('../fixtures/tasks')

// Tests dependency: having a populated ElasticSearch wikidata index
describe('tasks:byScore', () => {
  it('should returns 10 or less tasks to deduplicates, by default', done => {
    createHuman()
    .then(suspect => {
      createTask({ suspectUri: suspect.uri })
      .then(getByScore)
      .then(tasks => {
        tasks.length.should.be.belowOrEqual(10)
        tasks.length.should.be.aboveOrEqual(1)
        done()
      })
      .catch(undesiredErr(done))
    })
  })

  it('should returns a limited array of tasks to deduplicate', done => {
    createHuman()
    .then(suspect => {
      createTask({ suspectUri: suspect.uri })
      .then(() => getByScore({ limit: 1 }))
      .then(tasks => {
        tasks.length.should.equal(1)
        done()
      })
      .catch(undesiredErr(done))
    })
  })

  it('should take an offset parameter', done => {
    createHuman()
    .then(suspect => {
      createTask({ suspectUri: suspect.uri })
      .then(getByScore)
      .then(tasksA => {
        getByScore({ offset: 1 })
        .then(tasksB => {
          tasksA[1].should.deepEqual(tasksB[0])
          done()
        })
      })
    })
    .catch(undesiredErr(done))
  })
})

describe('tasks:bySuspectUris', () => {
  it('should return an array of tasks', done => {
    createHuman()
    .then(suspect => {
      createTask({ suspectUri: suspect.uri })
      .then(getByScore)
      .then(tasksA => {
        const { uri } = suspect
        getBySuspectUris(uri)
        .then(tasks => {
          tasks.should.be.an.Object()
          Object.keys(tasks).length.should.equal(1)
          tasks[uri].should.be.an.Array()
          tasks[uri][0].should.be.an.Object()
          done()
        })
      })
    })
    .catch(undesiredErr(done))
  })

  it('should not return archived tasks', done => {
    createHuman()
    .then(suspect => {
      const { uri } = suspect
      createTask({ uri })
      .then(task => {
        update(task.id, 'state', 'dismissed')
        .then(() => getBySuspectUris(uri))
        .then(tasks => {
          tasks[uri].length.should.equal(0)
          done()
        })
      })
    })
    .catch(undesiredErr(done))
  })

  it('should return an array of tasks even when no tasks is found', done => {
    const fakeUri = 'inv:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    getBySuspectUris(fakeUri)
    .then(tasks => {
      tasks.should.be.an.Object()
      Object.keys(tasks).length.should.equal(1)
      tasks[fakeUri].should.be.an.Array()
      tasks[fakeUri].length.should.equal(0)
      done()
    })
    .catch(undesiredErr(done))
  })
})

describe('tasks:bySuggestionUris', () => {
  it('should return an tasks', done => {
    createHuman()
    .then(suggestion => {
      const { uri } = suggestion
      createTask({ suggestionUri: uri })
      .then(() => {
        getBySuggestionUris(uri)
        .then(tasks => {
          tasks.should.be.an.Object()
          Object.keys(tasks).length.should.equal(1)
          tasks[uri].should.be.an.Array()
          tasks[uri][0].should.be.an.Object()
          done()
        })
      })
    })
    .catch(undesiredErr(done))
  })

  it('should return an array of tasks even when no tasks is found', done => {
    const uri = 'wd:Q32193244'
    getBySuggestionUris(uri)
    .then(tasks => {
      tasks.should.be.an.Object()
      Object.keys(tasks).length.should.equal(1)
      tasks[uri].should.be.an.Array()
      tasks[uri].length.should.equal(0)
      done()
    })
    .catch(undesiredErr(done))
  })
})
