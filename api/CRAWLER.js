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
var get_arg2 = require('../tools/csdn.js')

// 全局变量，存储爬取网址
var urlString = ''
const entities = new Entities()

var options = {
  maxConnections: 10,
  forceUTF8: true,
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  // This will be called for each crawled page
}

// 去空行处理图片
function getPageHtml(str, name) {
  return new Promise(function(resolve, reject) {
    if (name) {
      csdnImg(str, name).then(function(resp) {
        body = entities.decode(resp.body)
        var markdown = unescape(
          breakdance(body)
            .replace(/&#x/g, '%u')
            .replace(/;/g, '')
        )
        resolve({ uuids: resp.uuids, body: markdown })
      })
    } else {
      resolve({ uuids: [], body: body })
    }
  })
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
  if (name == 'cnblogs') {
    var reg = /(<[^\/]*?>)*<img[\s\S]*?src=\"([\S]*?)\"[^>]*?>([^\/]*?<[^>]*?>)*?/g
  }
  if (name == 'csdn') {
    var reg = /(<[^\/]*?>)*<img[\s\S]*?src=\"([\S]*?)\"[^>]*?>([^\/]*?<[^>]*?>)*?/g
  }
  if (name == 'jianshu') {
    var reg = /\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-format=\"image\/([\S]*)\"[\s\S]*?-caption\"><\/div>\n<\/div>/g
  }
  var images = str.match(reg)
  return new Promise(function(resolve, reject) {
    if (!images || images.length == 0) {
      resolve({ uuids: [], body: str })
    } else {
      images.forEach((image, index) => {
        if (name == 'csdn' || name == 'cnblogs') {
          var url = image.replace(reg, '$2')
          // var reg = /\<img[\s\S]*?src=\"([\S]*?)\"[\s\S]*?>/g
          var formatArray = url.split('.')
          var format = formatArray[formatArray.length - 1]
          if (format.length > 4) {
            format = 'png'
          }
        }
        if (name == 'jianshu') {
          var url = image.replace(reg, '$1')
          var format = image.replace(reg, '$2')
        }
        if (name == 'cnblogs' && /^http:\/\//.test(url)) {
          url = url.replace('http', 'https')
        }
        picCrawler(url, format)
          .then(function(resp) {
            if (resp.success) {
              var data = {
                image: 'data:image/' + resp.format + ';base64,' + resp.data,
                articleId: urlString
              }
              return postImage(data)
            }
          })
          .then(function(resp) {
            if (resp.success) {
              resps.push(resp.data)
              if (name == 'csdn' || name == 'cnblogs') {
                str = str.replace(
                  images[index],
                  '<img src="' + config.imageServe + resp.data + '">'
                )
              }
              if (name == 'jianshu') {
                str = str.replace(
                  images[index],
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

//获取图片(http & https)
function picCrawler(url, format) {
  return new Promise(function(resolve, reject) {
    if (/^upload-images/.test(url)) {
      url = 'https://' + url
    }
    if (/^https:\/\//.test(url)) {
      https
        .get(url, function(res) {
          var datas = []
          var size = 0
          // 重定向
          if (res.statusCode === 302) {
            var href = res.headers.location
            formatArray = href.split('.')
            format = formatArray[formatArray.length - 1]
            picCrawler(href.replace('https://', 'http://'), format).then(
              resp => {
                resolve(resp)
              }
            )
          } else {
            res.on('data', function(data) {
              datas.push(data)
              size += data.length
            })
            res.on('end', function(data) {
              var buff = Buffer.concat(datas, size)
              var pic = buff.toString('base64')
              if (format.length > 4) {
                format = 'png'
              }
              resolve({ success: true, data: pic, format: format })
            })
          }
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
    if (name === 'csdn') {
      get_arg2()
        .then(arg2 => {
          options['headers'] = {
            Cookie: arg2
          }
          crawlerModule(url, name, options, resolve, reject)
        })
        .catch(() => {
          crawlerModule(url, name, options, resolve, reject)
        })
    } else {
      crawlerModule(url, name, options, resolve, reject)
    }
  })
}

function crawlerModule(url, name, opt, resolve, reject) {
  var c = new Crawler(opt)
  c.queue([
    {
      uri: url,
      jQuery: false,
      timeout: 1000,
      retries: 2,
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
  urlString = url
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
