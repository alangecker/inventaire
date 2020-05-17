// Keep in sync with client/app/lib/boolean_tests
import _ from 'lodash'
const CONFIG = require('config')
const __ = CONFIG.universalPath
const wdk = require('wikidata-sdk')
const regex_ = __.require('lib', 'regex')
const { PositiveInteger: PositiveIntegerPattern } = regex_

const bindedTest = regexName => regex_[regexName].test.bind(regex_[regexName])

export const isCouchUuid = regex_.CouchUuid.test.bind(regex_.CouchUuid)
export const isNonEmptyString = str => typeof str === 'string' && str.length > 0

export const isUrl = bindedTest('Url')
export const isImageHash = bindedTest('ImageHash')
export const isLocalImg = bindedTest('LocalImg')
export const isAssetImg = bindedTest('AssetImg')
export const isUserImg = bindedTest('UserImg')
export const isLang = bindedTest('Lang')
export const isInvEntityId = isCouchUuid
export const isInvEntityUri = uri => {
  if (!isNonEmptyString(uri)) return false
  const [ prefix, id ] = uri && uri.split(':')
  return (prefix === 'inv') && isCouchUuid(id)
}
export const isWdEntityUri = uri => {
  if (!isNonEmptyString(uri)) return false
  const [ prefix, id ] = uri && uri.split(':')
  return (prefix === 'wd') && wdk.isItemId(id)
}
export const isEmail = bindedTest('Email')
export const isUserId = isCouchUuid
export const isTransactionId = isCouchUuid
export const isGroupId = isCouchUuid
export const isItemId = isCouchUuid
export const isUsername = bindedTest('Username')
export const isEntityUri = bindedTest('EntityUri')
export const isExtendedEntityUri = uri => {
  const [ prefix, id ] = uri.split(':')
  // Accept alias URIs.
  // Ex: twitter:Bouletcorp -> wd:Q1524522
  return isNonEmptyString(prefix) && isNonEmptyString(id)
}
export const isPropertyUri = bindedTest('PropertyUri')
export const isSimpleDay = str => {
  let isValidDate = false
  try {
    // This line will throw if the date is invalid
    // Ex: '2018-03-32' or '2018-02-30'
    const isoDate = (new Date(str)).toISOString()
    // Keep only the passed precision
    const truncatedIsoDate = isoDate.slice(0, str.length)
    isValidDate = truncatedIsoDate === str
  } catch (err) {
    isValidDate = false
  }

  return isValidDate && regex_.SimpleDay.test(str)
}

export const isNonEmptyArray = array => _.isArray(array) && (array.length > 0)
export const isNonEmptyPlainObject = obj => _.isPlainObject(obj) && (Object.keys(obj).length > 0)
export const isPositiveIntegerString = str => _.isString(str) && PositiveIntegerPattern.test(str)
export const isExtendedUrl = str => isUrl(str) || isLocalImg(str)
export const isCollection = array => Array.isArray(array) && _.every(array, _.isPlainObject)