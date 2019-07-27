/**
 * Dependencies
 */
var express = require('express')
var mixin = require('utils-merge')
var config = require('../config')
var request = require('request')

var db = require('../db/index')
/**
 * NOTES
 */
var NOTES = db.NOTES

/**
 * Exports
 */
module.exports = exports = express.Router()

/**
 * Private variables and functions
 */

//  去空格函数
function Trim(str, is_global) {
  var result
  result = str.replace(/(^\s+)|(\s+$)/g, '')
  if (is_global.toLowerCase() == 'g') {
    result = result.replace(/\s/g, '')
  }
  return result
}

// elasticsearch　配置
function getES(searchInfo, callback) {
  var options = {
    url: config.elasticSearchUrl + 'notes_v1/notes/_search',
    json: true,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: searchInfo
  }
  request(options, (err, re, body) => {
    if (!err && re.statusCode == 200) {
      var docs = []
      body.hits.hits.forEach(doc => {
        docs.push({ source: doc._source, highlight: doc.highlight })
      })
      callback({
        total: body.hits.total,
        docs: docs,
        status: true
      })
    } else {
      callback({
        total: 0,
        docs: [],
        status: false
      })
    }
  })
}

function deleteImage(uuids) {
  var options = {
    url: config.imageDeleteApi,
    json: true,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: { imgIds: uuids }
  }
  return new Promise((resolve, reject) => {
    if (uuids.length === 0) {
      resolve({ status: true })
    } else {
      request(options, (err, re, body) => {
        if (!err) {
          if (!body.error && re.statusCode == 200) {
            resolve({
              path: body.path,
              message: body.message,
              status: true
            })
          } else {
            resolve({
              status: false,
              message: body.message ? body.message : body.error
            })
          }
        } else {
          resolve({
            status: false,
            message: err
          })
        }
      })
    }
  })
}

// 查询笔记列表
exports.route('/').post(function(req, res) {
  var limit = Number(req.body.limit) || config.page.limit
  var skip = Number(req.body.skip) || config.page.skip
  var query = req.body.query || ''
  var search = {
    from: skip,
    size: limit,
    query: {
      bool: {
        must_not: [],
        should: [
          {
            match: {
              title: {
                query: query,
                operator: 'and',
                boost: 2
              }
            }
          },
          {
            match: {
              keywords: {
                query: query,
                operator: 'and',
                boost: 3
              }
            }
          },
          {
            match: {
              body: {
                query: query,
                operator: 'and',
                boost: 1
              }
            }
          }
        ]
      }
    },
    highlight: {
      pre_tags: [''],
      post_tags: [''],
      fields: {
        // body: {},
        // content: { fragment_size: 300, number_of_fragments: 10 },
        body: {},
        title: {}
        // _all: {}
      }
    }
  }
  if (query === '') {
    var search = {
      from: skip,
      size: limit,
      sort: {
        submittime: {
          order: 'desc'
        }
      }
    }
  }
  getES(search, function(data) {
    res.send({
      total: data.total,
      docs: data.docs
    })
  })
})

//新增笔记
exports.route('/add').post(function(req, res) {
  var title = req.body.title
  var address = req.body.address
  var keywords = req.body.keywords
  var body = req.body.body
  var uuids = req.body.uuids
  if (!title || !keywords) {
    res.send({
      code: 400,
      error: 'title and keywords is required'
    })
  } else if (Trim(title, 'g') === '' || keywords.length === 0) {
    res.send({
      code: 400,
      error: 'title and keywords can not be empty'
    })
  } else {
    NOTES.getNextID(function(err, ID) {
      if (err) {
        res.send({
          code: 400,
          error: err
        })
        return
      }
      var data = new NOTES({
        title: title,
        address: address,
        keywords: keywords,
        body: body,
        uuids: uuids,
        ID: ID,
        submittime: new Date()
      })
      data.save(function(err, data) {
        if (err) {
          res.send({
            code: 400,
            error: 'Save data failed!'
          })
          return
        } else {
          res.send({ code: 200, data: data })
        }
      })
    })
  }
})

//查询＆修改
exports
  .route('/modify/:id')
  .get(function(req, res) {
    if (!req.params.id) {
      res.send({
        code: 400,
        error: 'params error!'
      })
    }
    var ID = req.params.id
    var search = {
      query: {
        bool: {
          must: {
            match: {
              ID: ID
            }
          }
        }
      }
    }
    getES(search, function(data) {
      res.send({
        code: 200,
        total: data.total,
        docs: data.docs
      })
    })
  })
  .post(function(req, res) {
    if (!req.params.id) {
      res.send({
        error: 'params error!'
      })
    }
    NOTES.findOne({ ID: req.params.id }).exec(function(err, data) {
      if (err || !data) {
        res.send({
          code: 400,
          error: 'Data does not exist!'
        })
        return
      } else {
        // 置顶，修改ID
        mixin(data, req.body)
        data.save(function(err, data) {
          if (err) {
            res.send({
              code: 400,
              error: 'Save data failed!'
            })
            return
          }
          res.send({
            code: 200,
            message: '修改成功'
          })
        })
      }
    })
  })

//删除数据
exports.route('/delete/:id').get(function(req, res) {
  if (!req.params.id) {
    res.send({
      code: 400,
      error: 'params error!'
    })
  }
  NOTES.findOne({ ID: req.params.id }).exec(function(err, data) {
    if (err || !data) {
      res.send({
        code: 400,
        error: 'Data does not exist!'
      })
      return
    } else {
      var uuids = data.uuids
      deleteImage(uuids).then(response => {
        if (response.status) {
          data.remove(function(err, re) {
            if (err) {
              res.send({
                code: 400,
                error: '删除数据失败'
              })
            } else {
              res.send({
                code: 200,
                message: '删除笔记成功'
              })
            }
          })
        } else {
          res.send({
            code: 400,
            message: '删除图片失败'
          })
        }
      })
    }
  })
})

// 获取关键词信息

// 批量ID查询
exports.route('/batch').post(function(req, res) {
  var limit = Number(req.query.limit) || config.page.limit
  var skip = Number(req.query.skip) || config.page.skip

  var IDs = req.body.ids
  var condition = { ID: { $in: IDs } }
  NOTES.find(condition)
    .select('-_id')
    .sort({ ID: -1 })
    .limit(limit)
    .skip((skip - 1) * limit)
    .exec(function(err, docs) {
      if (err) {
        res.send({
          error: 'Get docs list failed!'
        })
        return
      }
      res.send({ total: IDs.length, docs: docs })
    })
})
