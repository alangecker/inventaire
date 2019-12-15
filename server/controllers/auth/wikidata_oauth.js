const CONFIG = require('config')
const __ = CONFIG.universalPath
const requests_ = __.require('lib', 'requests')
const error_ = __.require('lib', 'error/error')
const root = CONFIG.fullPublicHost()
// eslint-disable-next-line camelcase
const { consumer_key, consumer_secret } = CONFIG.wikidataOAuth
const qs = require('querystring')
const user_ = __.require('controllers', 'user/lib/user')

// Alternatively using the nice or the non-nice URL
// see https://mediawiki.org/wiki/OAuth/For_Developers#Notes
const wdHost = 'https://www.wikidata.org'
const wdBaseNice = `${wdHost}/wiki/`
const wdBaseNonNice = `${wdHost}/w/index.php?title=`
const step1Url = `${wdBaseNonNice}Special:OAuth/initiate`
const step2Url = `${wdBaseNice}Special:OAuth/authorize`
const step3Url = `${wdBaseNonNice}Special:OAuth/token`
const reqTokenSecrets = {}

module.exports = (req, res) => {
  const { _id: reqUserId } = req.user
  const { oauth_verifier: verifier, oauth_token: reqToken, redirect } = req.query

  const step1 = verifier != null || reqToken != null

  if (step1) {
    getStep1Token(redirect)
    .then(step1Res => {
      const { oauth_token_secret: reqTokenSecret } = qs.parse(step1Res)
      reqTokenSecrets[reqUserId] = reqTokenSecret
      res.redirect(`${step2Url}?${step1Res}`)
    })
    .catch(error_.Handler(req, res))
  } else {
    getStep3(reqUserId, verifier, reqToken)
    .then(saveUserTokens(reqUserId))
    .then(() => res.redirect(`${root}${redirect}`))
    .catch(error_.Handler(req, res))
  }
}

const getStep1Token = redirect => {
  return requests_.post({
    url: step1Url,
    oauth: {
      callback: `${root}/api/auth?action=wikidata-oauth&redirect=${redirect}`,
      consumer_key,
      consumer_secret
    }
  })
}

const getStep3 = (reqUserId, verifier, oauthToken) => {
  const reqTokenSecret = reqTokenSecrets[reqUserId]
  return requests_.post({
    url: step3Url,
    oauth: {
      consumer_key,
      consumer_secret,
      token: oauthToken,
      token_secret: reqTokenSecret,
      verifier
    }
  })
  .finally(() => {
    delete reqTokenSecrets[reqUserId]
  })
}

const saveUserTokens = reqUserId => step3Res => {
  const { oauth_token_secret: userTokenSecret, oauth_token: userToken } = qs.parse(step3Res)
  const data = { token: userToken, token_secret: userTokenSecret }
  return user_.setOauthTokens(reqUserId, 'wikidata', data)
}
