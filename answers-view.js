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

  let content = 'Loading...'
  let dirty = false
  if (state.content) {
    content = state.content.content || 'Loading...'
    dirty = state.content.content !== state.content.originalContent
  } else {
    send('fetchContent', { path: `_answers/${lesson}-answers.md` })
  }

  function commit () {
    const msg = document.getElementById('commit_message')
    send('commit', { message: msg.value || msg.placeholder })
  }

  return html`
    <main>
      ${renderHeader(state, send)}
      <div class='grid grid--gut6 py6'>
        <div class='col col--5 col--offl6'>
          <input id='commit_message' style='width: 100%' class='input' disabled=${!dirty} placeholder='Update ${lesson} answers' />
        </div>
        <div class='col col--1'>
          <button onclick=${commit} style='width: 100%' class='btn btn--s' disabled=${!dirty}>Commit</button>
        </div>
      </div>
      <div class='grid grid--gut6 bg-gray-faint'>
        <div class='col col--6'>
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

  cm.on('change', debounce(onChange, 300))

  return widget({
    onupdate: function (el, markdown) {
      if (cm.getValue() !== markdown) {
        cm.setValue(markdown)
      }
    },
    render: function (markdown) {
      return root
    }
  })

  function onChange (change) {
    if (change.origin === 'setValue') { return }
    const newContent = cm.getValue()
    send('updateContent', { content: newContent })
  }
}

function updateMathJax () {
  MathJax.Hub.Queue(['Typeset', MathJax.Hub])
}
