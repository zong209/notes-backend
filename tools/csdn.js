var Crawler = require('crawler')
var config = require('../config')

// var options = {
//   url: config.csdnHome,
//   method: 'GET',
//   // encoding: null,
//   json: true,
//   headers: {
//     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//   }
// }

var c = new Crawler({
  maxConnections: 10,
  forceUTF8: true,
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  // This will be called for each crawled page
})

function get_script_data() {
  return new Promise((resolve, reject) => {
    c.queue([
      {
        uri: config.csdnHome,
        jQuery: false,
        timeout: 1000,
        retries: 1,
        retryTimeout: 1000,
        callback: function(error, res, done) {
          if (error) {
            // console.log(error);
            reject(false)
          } else {
            var reg = /arg1='([^']+)/g
            var arg1 = res.body.toString().match(reg)
            if (arg1) {
              arg1 = arg1[0].replace(reg, '$1')
              resolve(arg1)
            } else {
              reject(false)
            }
          }
          done()
        }
      }
    ])
  })
}

function hexXor(_0x4e08d8, _0x23a392) {
  var _0x5a5d3b = ''
  for (
    var length = 0x0;
    length < _0x23a392.length && length < _0x4e08d8.length;
    length += 0x2
  ) {
    var _0x401af1 = parseInt(_0x23a392.slice(length, length + 0x2), 0x10)
    var _0x105f59 = parseInt(_0x4e08d8.slice(length, length + 0x2), 0x10)
    var _0x189e2c = Number(_0x401af1 ^ _0x105f59).toString(16)
    // _0x189e2c = String(_0x189e2c).slice(2)
    if (_0x189e2c.length == 0x1) {
      _0x189e2c = '0' + _0x189e2c
    }
    _0x5a5d3b += _0x189e2c
  }
  return _0x5a5d3b
}

function unsbox(arg) {
  var _0x4b082b = [
    0xf,
    0x23,
    0x1d,
    0x18,
    0x21,
    0x10,
    0x1,
    0x26,
    0xa,
    0x9,
    0x13,
    0x1f,
    0x28,
    0x1b,
    0x16,
    0x17,
    0x19,
    0xd,
    0x6,
    0xb,
    0x27,
    0x12,
    0x14,
    0x8,
    0xe,
    0x15,
    0x20,
    0x1a,
    0x2,
    0x1e,
    0x7,
    0x4,
    0x11,
    0x5,
    0x3,
    0x1c,
    0x22,
    0x25,
    0xc,
    0x24
  ]
  var _0x4da0dc = []
  var _0x12605e = ''
  for (var _0x20a7bf = 0x0; _0x20a7bf < arg['length']; _0x20a7bf++) {
    var _0x385ee3 = arg[_0x20a7bf]
    for (var _0x217721 = 0x0; _0x217721 < _0x4b082b.length; _0x217721++) {
      if (_0x4b082b[_0x217721] == _0x20a7bf + 0x1) {
        _0x4da0dc[_0x217721] = _0x385ee3
      }
    }
  }
  _0x12605e = _0x4da0dc['join']('')
  return _0x12605e
}

function get_arg2() {
  var key = config.csdnKey
  return new Promise((resolve, reject) => {
    get_script_data()
      .then(res => {
        if (res) {
          var _0x23a392 = unsbox(res)
          var arg2 = 'acw_sc__v2=' + hexXor(key, _0x23a392)
          resolve(arg2)
        } else {
          resolve('')
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}

module.exports = get_arg2
// get_arg2().then(res => {
//   console.log(res)
// })
