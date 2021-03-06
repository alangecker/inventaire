const __ = require('config').universalPath
const getByAccessLevel = require('./get_by_access_level')
const { areFriendsOrGroupCoMembers } = __.require('controllers', 'user/lib/relations_status')
const groups_ = __.require('controllers', 'groups/lib/groups')

// Return what the reqUserId user is allowed to see from a user or a group inventory
module.exports = {
  byUser: (userId, reqUserId) => {
    if (userId === reqUserId) return getByAccessLevel.private(userId)
    if (!reqUserId) return getByAccessLevel.public(userId)

    return areFriendsOrGroupCoMembers(userId, reqUserId)
    .then(usersAreFriendsOrGroupCoMembers => {
      if (usersAreFriendsOrGroupCoMembers) return getByAccessLevel.network(userId)
      else return getByAccessLevel.public(userId)
    })
  },

  byGroup: (groupId, reqUserId) => {
    return groups_.getGroupMembersIds(groupId)
    .then(allGroupMembers => {
      if (reqUserId && allGroupMembers.includes(reqUserId)) return getByAccessLevel.network(allGroupMembers)
      else return getByAccessLevel.public(allGroupMembers)
    })
  }
}
