const CONFIG = require('config')
const __ = CONFIG.universalPath
require('should')
const { Promise } = __.require('lib', 'promises')
const { merge } = require('../utils/entities')
const { createHuman } = require('../fixtures/entities')
const { deleteByUris: deleteEntityByUris } = require('../utils/entities')
const { createTask } = require('../fixtures/tasks')
const { getByIds, getBySuspectUri, update, checkEntities } = require('../utils/tasks')

// Tests dependency: having a populated ElasticSearch wikidata index
describe('tasks:hooks', () => {
  describe('entity merge', () => {
    it('should update same suspect tasks to merged state', done => {
      // Alexander Kennedy is expected to have several merge suggestions
      createHuman({ labels: { en: 'Alexander Kennedy' } })
      .then(human => checkEntities(human.uri))
      .then(tasks => {
        const task = tasks[0]
        const anotherTask = tasks[1]
        return merge(task.suspectUri, task.suggestionUri)
        .delay(100)
        .then(() => getByIds(anotherTask._id))
        .then(tasks => {
          const updatedTask = tasks[0]
          updatedTask.state.should.equal('merged')
          done()
        })
      })
      .catch(done)
    })

    it('should update task state to merged', done => {
      Promise.all([ createHuman(), createHuman() ])
      .spread((suspect, suggestion) => {
        const taskParams = {
          suspectUri: suspect.uri,
          suggestionUri: suggestion.uri
        }
        createTask(taskParams)
        .then(task => {
          merge(suspect.uri, suggestion.uri)
          .delay(100)
          .then(() => getByIds(task.id))
          .then(tasks => {
            const updatedTask = tasks[0]
            updatedTask.state.should.equal('merged')
            done()
          })
        })
        .catch(done)
      })
    })

    it('should update relationScore of tasks with same suspect', done => {
      // John Smith is expected to have several merge suggestions
      createHuman({ labels: { en: 'John Smith' } })
      .then(human => checkEntities(human.uri))
      .then(tasks => {
        const taskToUpdate = tasks[0]
        const otherTask = tasks[1]
        const { relationScore: taskRelationScore } = taskToUpdate
        update(taskToUpdate._id, 'state', 'dismissed')
        .delay(100)
        .then(() => getByIds(otherTask._id))
        .then(tasks => {
          const updatedTask = tasks[0]
          updatedTask.relationScore.should.not.equal(taskRelationScore)
          done()
        })
      })
      .catch(done)
    })
  })

  describe('entity removed', () => {
    it('should update tasks to merged state when the entity is deleted', done => {
      createHuman()
      .then(suspect => {
        createTask({ suspectUri: suspect.uri })
        .then(task => deleteEntityByUris(suspect.uri))
        .then(() => getBySuspectUri(suspect.uri))
        .then(tasks => {
          tasks.length.should.equal(0)
          done()
        })
      })
      .catch(done)
    })
  })
})
