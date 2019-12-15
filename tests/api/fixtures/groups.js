const { authReq, authReqB, getUserB } = require('../utils/utils')
const faker = require('faker')
const endpointBase = '/api/groups'
const endpointAction = `${endpointBase}?action`

const getGroup = groupId => {
  return authReq('get', `${endpointAction}=by-id&id=${groupId}`)
  .get('group')
}

const createGroup = name => {
  return authReq('post', `${endpointBase}?action=create`, {
    name,
    position: [ 1, 1 ],
    searchable: true
  })
}

const membershipAction = (reqFn, action, groupId, userId) => {
  return reqFn('put', endpointBase, { action, group: groupId, user: userId })
}

const groupName = () => `${faker.lorem.words(3)} group`

// Resolves to a group with userA as admin and userB as member
const groupPromise = createGroup(groupName())
  .then(group => {
    return membershipAction(authReqB, 'request', group._id)
    .then(() => getUserB())
    .then(userB => membershipAction(authReq, 'accept-request', group._id, userB._id))
    .then(() => getGroup(group._id))
  })

module.exports = { endpointBase, groupPromise, getGroup, groupName }
