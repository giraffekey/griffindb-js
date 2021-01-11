'use strict'

// Electron has `AbortController` and should use that instead of custom.
// Works around: https://github.com/mysticatea/abort-controller/issues/24
module.exports = typeof AbortController === 'function'
  /* eslint-env browser */
  /* istanbul ignore next */
  ? require('./abort-controller.browser')
  : require('abort-controller')
