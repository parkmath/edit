const html = require('choo/html')

module.exports = function renderError (state) {
  if (!state.error) { return '' }
  return html`
  <div class='align-center round bg-red-faint color-red-dark'>
    ${JSON.stringify(state.error, null, 2)}
  </div>
  `
}
