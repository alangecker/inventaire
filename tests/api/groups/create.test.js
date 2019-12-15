const CONFIG = require('config')
const __ = CONFIG.universalPath
require('should')
const { authReq, undesiredErr, undesiredRes } = require('../utils/utils')
const { groupName } = require('../fixtures/groups')
const slugify = __.require('controllers', 'groups/lib/slugify')
const endpoint = '/api/groups?action=create'

describe('groups:create', () => {
  it('should reject without name', done => {
    authReq('post', endpoint)
    .then(undesiredRes(done))
    .catch(err => {
      err.body.status_verbose.should.equal('missing parameter in body: name')
      done()
    })
    .catch(done)
  })

  it('should create a group', done => {
    const name = groupName()
    authReq('post', endpoint, { name })
    .then(res => {
      res.name.should.equal(name)
      res.slug.should.equal(slugify(name))
      res.searchable.should.be.true()
      res.creator.should.equal(res.admins[0].user)
      done()
    })
    .catch(undesiredErr(done))
  })

  it('should reject a group with an empty name or generated slug', done => {
    const name = '??'
    authReq('post', endpoint, { name })
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.error_name.should.equal('invalid_name')
      done()
    })
    .catch(undesiredErr(done))
  })
})
