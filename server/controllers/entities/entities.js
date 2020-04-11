const __ = require('config').universalPath
const ActionsControllers = __.require('lib', 'actions_controllers')

module.exports = {
  get: ActionsControllers({
    public: {
      'by-uris': require('./by_uris_get'),
      changes: require('./changes'),
      'reverse-claims': require('./reverse_claims'),
      'author-works': require('./author_works'),
      'serie-parts': require('./serie_parts'),
      history: require('./history'),
      images: require('./images'),
      popularity: require('./popularity')
    },
    admin: {
      contributions: require('./contributions'),
      duplicates: require('./duplicates'),
      activity: require('./activity')
    }
  }),

  post: ActionsControllers({
    public: {
      'by-uris': require('./by_uris_get')
    },
    authentified: {
      create: require('./create'),
      resolve: require('./resolve')
    },
    admin: {
      'delete-by-uris': require('./by_uris_delete')
    }
  }),

  put: ActionsControllers({
    authentified: {
      'update-claim': require('./update_claim'),
      'update-label': require('./update_label'),
      'move-to-wikidata': require('./move_to_wikidata')
    },
    admin: {
      merge: require('./merge'),
      'revert-merge': require('./revert_merge')
    }
  })
}

require('./lib/update_search_engine')()
