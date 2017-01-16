const qs = require('querystring')
const html = require('choo/html')
const ghToken = require('./access-token')()
const renderError = require('./error.js')

const clientId = process.env.PARKMATH_CLIENT_ID

module.exports = function renderHeader (state, send) {
  let content
  if (!ghToken) {
    const params = {
      client_id: clientId,
      scope: 'repo'
    }
    const redirect = `https://github.com/login/oauth/authorize?${qs.stringify(params)}`
    content = html`
      <a href='${redirect}' class='link'>Log in with GitHub</a>
    `
  } else if (!state.user) {
    content = 'Logging in'
  } else {
    content = html`
    <div class='align-r'>
      <a class='link' href='https://github.com/${state.user}'>
        <svg class='icon inline-block'><use xlink:href='#icon-github'/></svg>
        ${state.user}
      </a>
      <button class='btn btn--xs' onclick=${() => send('logout', {})} title='Logout'>
        <svg class='icon icon--s inline-block'><use xlink:href='#icon-logout'/></svg>
      </button>
    </div>
    `
  }

  return html`
  <header class='grid grid--gut6'>
    <div class='col col--6 col--offl3'>${renderError(state)}</div>
    <div class='col col--2 col--offl1'>
      ${content}
    </div>
  </header>
  `
}
