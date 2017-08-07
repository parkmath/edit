/* global MathJax */

const html = require('choo/html')
const widget = require('cache-element/widget')
const CodeMirror = window.CodeMirror = require('codemirror')
const remark = require('remark')
const remarkHtml = require('remark-html')
const renderHeader = require('./header')
const debounce = require('lodash.debounce')

// load markdown mode for codemirror
require('codemirror/mode/gfm/gfm')
require('codemirror/mode/stex/stex')
require('codemirror/addon/mode/multiplex')
CodeMirror.defineMode('mathdown', function (config) {
  return CodeMirror.multiplexingMode(
    CodeMirror.getMode(config, 'gfm'), {
      open: '$',
      close: '$',
      mode: CodeMirror.getMode(config, 'stex'),
      delimStyle: 'delimit'
    }
  )
})

let codeMirrorWidget
let renderMarkdown = RenderedMarkdownWidget()

module.exports = function answersView (state, prev, send) {
  const lesson = state.location.params.lesson

  if (!codeMirrorWidget) {
    codeMirrorWidget = CodeMirrorWidget(send)
  }

  const answersPath = `_answers/${lesson}-answers.md`
  let content = ' '
  let title = ''
  let dirty = false
  if (state.content && state.content.path === answersPath) {
    dirty = state.content.content !== state.content.originalContent
    title = `${state.content.loading ? 'Loading ' : 'Editing '} ${state.content.path} `
    content = state.content.content || ''
  } else {
    title = `Loading ${answersPath}`
    send('fetchContent', { path: answersPath })
  }

  function commit () {
    const msg = document.getElementById('commit_message')
    send('commit', { message: msg.value || msg.placeholder })
  }

  return html`
    <main>
      ${renderHeader(state, send)}
      <div id='answer-header'>
        <div class='grid grid--gut6 py6'>
          <div class='col col--6'>
            <div class='inline-block txt-bold'>${title}</div>
            ${dirty ? html`<div class='inline-block round bg-blue-faint color-blue-dark px6'>uncommited changes</div>` : ''}
          </div>
          <div class='col col--5'>
            <input id='commit_message' style='width: 100%' class='input' disabled=${!dirty} placeholder='Update ${lesson} answers' />
          </div>
          <div class='col col--1'>
            <button onclick=${commit} style='width: 100%' class='btn btn--s' disabled=${!dirty}>Commit</button>
          </div>
        </div>
      </div>
      <div class='grid grid--gut6 bg-gray-faint'>
        <div id='content-wrapper' class='col col--6'>
          ${codeMirrorWidget(content)}
        </div>
        <div class='col col--6 p24'>
          ${renderMarkdown(content)}
        </div>
      </div>
    </main>
  `
}

function RenderedMarkdownWidget () {
  return widget({
    onupdate: function (el, markdown) {
      el.innerHTML = render(markdown)
      updateMathJax()
    },
    render: function (markdown) {
      const el = html`<div id='rendered'></div>`
      el.innerHTML = render(markdown)
      setTimeout(updateMathJax, 100)
      return el
    }
  })

  function render (markdown) {
    const file = remark().use(remarkHtml).process(markdown)
    return file.contents
      // hack to avoid line break between '\' and '{' in HTML rendered from
      // "\\{"
      .replace(/\\\n/g, '\\')
  }
}

function CodeMirrorWidget (send) {
  const root = html`<div id='content' class='viewport-almost'></div>`
  const cm = window.cm = CodeMirror(root, {
    mode: 'mathdown',
    value: '',
    lineWrapping: true,
    viewportMargin: Infinity
  })

  let currentValue

  const postContent = debounce(function (content) {
    send('updateContent', { content: currentValue })
  }, 300)

  cm.on('change', onChange)

  return widget({
    onupdate: function (el, markdown) {
      const value = cm.getValue()
      if (currentValue && value === currentValue) {
        // avoid resetting the editor's content due to a previous
        // updateContent action causing a render after more typing
        // has happened
        return
      }
      if (value !== currentValue && value !== markdown) {
        cm.setValue(markdown)
      }
    },
    render: function (markdown) {
      return root
    }
  })

  function onChange (instanc, change) {
    if (change.origin === 'setValue') { return }
    currentValue = cm.getValue()
    postContent()
  }
}

function updateMathJax () {
  MathJax.Hub.Queue(['Typeset', MathJax.Hub])
}
