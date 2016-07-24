var Promise = require('bluebird');
var hash = {};

module.exports = {
  get: function(key) {
    return Promise(function(res, rej) { res(hash[key]); });
  },

  set: function(key, value) {
    hash[key] = value;
    return Promise(function(res, rej) { res(hash[key]); });
  },
};
