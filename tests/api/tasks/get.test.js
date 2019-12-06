const CONFIG = require('config')
const __ = CONFIG.universalPath
require('should')
const { undesiredErr } = __.require('apiTests', 'utils/utils')
const { createSomeTasks } = require('../fixtures/tasks')
const { createHuman, createWorkWithAuthor } = require('../fixtures/entities')
const { getByScore, getBySuspectUris, getBySuggestionUris, update, checkEntities } = require('../utils/tasks')
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

  it('should return tasks in the right order', done => {
    const humanLabel = 'Stanislas Lem' // has no homonyms
    const workLabel = 'Solaris' // too short label to be automerged
    createSomeTasks('Gilbert Simondon')
    .then(() => createHuman({ labels: { en: humanLabel } }))
    .then(human => {
      return createWorkWithAuthor(human, workLabel)
      .then(work => checkEntities(human.uri))
      .then(() => getByScore())
      .then(tasks => {
        tasks.forEach((task, i) => {
          const previousTask = tasks[i - 1]
          if (previousTask == null) return
          const prevOccurrencesCount = previousTask.externalSourcesOccurrences.length
          const occurrencesCount = task.externalSourcesOccurrences.length
          return prevOccurrencesCount.should.be.aboveOrEqual(occurrencesCount)
        })
        done()
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
