import _ from 'lodash'
import * as server_ from '@/lib/utils/base'
import * as logs_ from '@/lib/utils/logs'
import * as booleanValidations_ from '@/lib/boolean_validations' 

const out = Object.assign(_, server_, logs_, booleanValidations_)
export default out

module.exports = out // for legacy __.require() syntax compatibility
