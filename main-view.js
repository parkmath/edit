const html = require('choo/html')
const renderHeader = require('./header')

module.exports = function mainView (state, prev, send) {
  let body = ''

  if (state.answers) {
    body = html`
    <div class='grid'>
      <ul class='col col--8 col--offl2'>
        ${state.answers.map(answer => {
          const lesson = answer.slice(9, 13)
          return html`<li>
              <a class='link' href=${'#answers/' + lesson}>${lesson}</a>
            </li>
          `
        })}
      </ul>
    </div>
    `
  }

  return html`
    <main>
      ${renderHeader(state, send)}
      ${body}
    </main>
  `
}

