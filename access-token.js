/* global localStorage */
module.exports = function accessToken () {
  return localStorage.getItem('ghToken')
}
