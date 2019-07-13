/**
 * Dependencies
 */
var express = require('express')
// var mixin = require('utils-merge');
var config = require('../config')
var https = require('https')
var http = require('http')
var request = require('request')
var Crawler = require('crawler')
var cheerio = require('cheerio')

// const fs = require('fs');
var Entities = require('html-entities').XmlEntities
var breakdance = require('breakdance')

const entities = new Entities()

// 去空行处理图片
function getPageHtml(str, name) {
  // var REG_BODY = /<hr[^>]*>([\s\S]*)<\hr>/;
  // var body = new String(REG_BODY.exec(str));
  var body = str.replace(/(^\s*)|(\s*$)/g, '')
  var reg = /(<code>[\s\S]+?)([\n]{2,})+([\s\S]+?<\/code>)/g
  // var reg=/(<code>[\s\S]+?)(\n)+(\#\#[\s\S]+?<\/code>)/g
  body = body.replace(reg, '$1\n' + '$3')
  return new Promise(function(resolve, reject) {
    if (name) {
      csdnImg(body, name).then(function(resp) {
        body = entities.decode(resp.body)
        var markdown = breakdance(body)
        resolve({ uuids: resp.uuids, body: markdown })
        // if (name == 'jianshu') {
        //   //html to markdown
        //   // und.convert(body, function(err, markdown) {
        //   //   if (err) {
        //   //     resolve({ uuids: [], body: 'trans markdown error' })
        //   //   } else {
        //   //     resolve({ uuids: resp.uuids, body: markdown })
        //   //   }
        //   // })
        // } else {
        //   resolve({ uuids: resp.uuids, body: body })
        // }
      })
    } else {
      resolve({ uuids: [], body: body })
    }
  })
}

//简书图片块处理
function imgBlockProcess(str) {
  var reg = /\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-filesize=\"[\s\S\n]*?<\/div>\n<\/div>/g
  // var temp=str.match(reg)
  str = str.replace(reg, '<div><img src="http://' + '$1' + '"></div>')
  return str
}

// 上传图片至数据库
function postImage(data) {
  return new Promise(function(resolve, reject) {
    var options = {
      url: config.imageServerApi,
      json: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data
    }
    request(options, (err, re, body) => {
      if (!err && re.statusCode == 200) {
        resolve({ success: true, data: body.path, message: body.message })
      } else {
        reject({ success: false, msg: 'save image failed' })
      }
    })
  })
}

//csdn图片处理
function csdnImg(str, name) {
  var resps = []
  if (name == 'csdn' || name == 'cnblogs') {
    var reg = /\<img[\s\S]*?src=\"([\S]*?)\"[\s\S]*?>/g
  }
  if (name == 'jianshu') {
    var reg = /\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-filesize=\"[\s\S\n]*?<\/div>\n<\/div>/g
  }
  var images = str.match(reg)
  return new Promise(function(resolve, reject) {
    if (!images || images.length == 0) {
      resolve({ uuids: [], body: str })
    } else {
      images.forEach(image => {
        var url = image.replace(reg, '$1')
        if (name == 'cnblogs' && /^http:\/\//.test(url)) {
          url = url.replace('http', 'https')
        }
        // if(!/^http:\/\//.test(url)){
        //     url='http://'+url
        // }
        picCrawler(url)
          .then(function(resp) {
            if (resp.success) {
              var data = {
                image: 'data:image/' + resp.format + ';base64,' + resp.data
              }
              return postImage(data)
            }
          })
          .then(function(resp) {
            if (resp.success) {
              resps.push(resp.data)
              if (name == 'csdn' || name == 'cnblogs') {
                str = str.replace(url, config.imageServe + resp.data)
              }
              if (name == 'jianshu') {
                // 替换图片标签
                var newReg = /\<div class=\"image-package\">[\s\S\n]*?\n<div class=\"image-caption\"><\/div>\n<\/div>/
                // var newReg = /\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-filesize=\"[\s\S\n]*?<\/div>\n<\/div>/
                str = str.replace(
                  newReg,
                  '<img src="' + config.imageServe + resp.data + '">'
                )
              }
              if (resps.length == images.length) {
                resolve({ uuids: resps, body: str })
              }
            }
          })
          .catch(res => {
            reject(res)
          })
      })
    }
  })
}

var c = new Crawler({
  maxConnections: 10,
  forceUTF8: true,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
  // This will be called for each crawled page
})

//获取图片(http & https)
function picCrawler(url) {
  return new Promise(function(resolve, reject) {
    if (/^upload-images/.test(url)) {
      url = 'https://' + url
    }
    var formatArray = url.split('.')
    var format = formatArray[formatArray.length - 1]
    if (/^https:\/\//.test(url)) {
      https
        .get(url, function(res) {
          var datas = []
          var size = 0
          res.on('data', function(data) {
            datas.push(data)
            size += data.length
          })
          res.on('end', function(data) {
            var buff = Buffer.concat(datas, size)
            var pic = buff.toString('base64')
            resolve({ success: true, data: pic, format: format })
          })
        })
        .on('error', function(err) {
          // console.log('获取验证码异常,异常原因'+err);
          reject({ success: false, msg: '获取图片失败' })
        })
    } else {
      if (!/^http:\/\//.test(url)) {
        url = 'http://' + url
      }
      // console.log(url)
      http
        .get(url, function(res) {
          var datas = []
          var size = 0
          res.on('data', function(data) {
            datas.push(data)
            size += data.length
          })
          res.on('end', function(data) {
            var buff = Buffer.concat(datas, size)
            var pic = buff.toString('base64')
            resolve({ success: true, data: pic, format: format })
          })
        })
        .on('error', function(err) {
          // console.log('获取验证码异常,异常原因'+err);
          reject({ success: false, msg: '获取图片失败' })
        })
    }
  })
}

function pageCrawler(url, name) {
  return new Promise(function(resolve, reject) {
    c.queue([
      {
        uri: url,
        jQuery: false,
        timeout: 1000,
        retries: 1,
        retryTimeout: 1000,
        callback: function(error, res, done) {
          if (error) {
            // console.log(error);
            reject('failed')
          } else {
            var $ = cheerio.load(res.body)
            if (name == 'jianshu') {
              var page = new String($('.show-content').html())
            }
            if (name == 'csdn') {
              var page = new String(
                $('.htmledit_views').html() || $('.markdown_views').html()
              )
            }
            if (name == 'cnblogs') {
              var page = new String($('.blogpost-body').html())
            }
            getPageHtml(page, name).then(function(resp) {
              resolve(resp)
            })
          }
          done()
        }
      }
    ])
  })
}

/**
 * Exports
 */
module.exports = exports = express.Router()

/**
 * Private variables and functions
 */

// CRAWLER management
exports.route('/').get(function(req, res) {
  var url = req.query.url
  var name = req.query.name
  if (!url || !name) {
    res.send({ error: 'url & name is required' })
  } else {
    pageCrawler(url, name)
      .then(function(resp) {
        res.send({ status: true, resp: resp })
      })
      .catch(function(resp) {
        res.send({ status: false, resp: resp })
      })
  }
})
