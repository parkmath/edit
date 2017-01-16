/* global localStorage */
let ghToken = localStorage.getItem('ghToken')
module.exports = function accessToken () {
  return ghToken
}
