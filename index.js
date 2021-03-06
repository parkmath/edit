/* global fetch */
/* global localStorage */
const qs = require('querystring')
const xtend = require('xtend')
const choo = require('choo')
const Base64 = require('js-base64').Base64

const getToken = require('./access-token')

const app = choo({
  onAction: function (state, data, name, caller) {
    console.log('action', name, data)
  },
  onStateChange: function (state, data, prev, caller, createSend) {
    console.log('state', state)
  }
})

const query = qs.parse(window.location.search.substring(1))

app.model({
  state: {
    answers: [],
    content: null
  },

  subscriptions: {
    login: function (send, done) {
      if (getToken()) {
        send('fetchUser', {}, done)
      } else if (query.code) {
        fetch(`https://gatekeeper-parkmath.herokuapp.com/authenticate/${query.code}`, {
          headers: { 'Accept': 'application/json' }
        })
        .then(resp => resp.json())
        .then(result => {
          if (result.error || result.message) {
            return send('setError', result.error || result.message, done)
          }
          localStorage.setItem('ghToken', result.token)
          // strip code off the URL
          window.location.href = window.location.href.replace(/\?[^#]*/, '')
        })
      }
    }
  },

  reducers: {
    setToken: (state, data) => xtend(state, { token: data.token }),
    setError: (state, error) => xtend(state, { error: error }),
    setUser: (state, user) => xtend(state, { user: user.login }),
    setAnswers: (state, data) => xtend(state, {
      answers: data.map(item => item.path)
    }),
    setContent: (state, data) => {
      if (data.content) {
        const decoded = Base64.decode(data.content)
        data.content = localStorage.getItem(data.path) || decoded
        data.originalContent = decoded
      }
      return xtend(state, { content: data })
    },
    updateContent: (state, data) => {
      const lessonContent = xtend(state.content, data)
      localStorage.setItem(state.content.path, lessonContent.content)
      return xtend(state, {
        content: xtend(state.content, lessonContent)
      })
    }
  },

  effects: {
    fetchUser: function (state, data, send, done) {
      fetch(gh('/user'))
      .then(resp => resp.json())
      .then(result => {
        if (result.error || result.message) {
          return send('setError', result.error || result.message, done)
        }

        return send('setUser', result, function (err) {
          if (err) { return done(err) }
          send('fetchAnswers', {}, done)
        })
      })
      .catch(error => send('setError', error, done))
    },

    fetchAnswers: function (state, data, send, done) {
      fetch(gh('/repos/parkmath/parkmath/contents/_answers'))
      .then(resp => resp.json())
      .then(result => {
        if (result.error || result.message) {
          return send('setError', result.error || result.message, done)
        }

        return send('setAnswers', result, done)
      })
      .catch(error => send('setError', error, done))
    },

    fetchContent: function (state, data, send, done) {
      const contentPath = data.path
      send('setContent', { path: contentPath, loading: true }, function (err) {
        if (err) { return done(err) }
        fetch(gh(`/repos/parkmath/parkmath/contents/${contentPath}`))
        .then(resp => resp.json())
        .then(result => {
          if (result.error || result.message) {
            return send('setError', result.error || result.message, done)
          }

          return send('setContent', result, done)
        })
        .catch(error => send('setError', error, done))
      })
    },

    logout: function (state, data, send, done) {
      localStorage.clear()
      return send('setUser', {}, function (err) {
        if (err) { return done(err) }
        send('setAnswers', [], done)
      })
    },

    commit: function (state, data, send, done) {
      if (!state.content) {
        return done(new Error('No content to commit'))
      }

      const path = state.content.path
      fetch(gh(`/repos/parkmath/parkmath/contents/${path}`), {
        method: 'PUT',
        body: JSON.stringify({
          path: path,
          message: data.message,
          content: Base64.encode(state.content.content),
          sha: state.content.sha
        })
      })
      .then(resp => {
        if (resp.status !== 200) {
          send('setError', `Failed to update ${path}: ${resp.status} ${resp.statusText}`, done)
        } else {
          localStorage.removeItem(path)
          send('fetchContent', { path: path }, done)
        }
      })
      .catch(error => send('setError', error, done))
      // fetch()
    }
  }
})

const basepath = window.location.pathname
app.router([
  [`${basepath}`, require('./main-view')],
  [`${basepath}/answers/:lesson`, require('./answers-view')]
])

document.querySelector('#app').appendChild(app.start())

// github API url
function gh (path, params) {
  params = qs.stringify(Object.assign({access_token: getToken()}, params))
  if (!path.startsWith('/')) { path = `/${path}` }
  return `https://api.github.com${path}?${params}`
}

