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
var IMAGES = db.IMAGES

/**
 * Exports
 */
module.exports = exports = express.Router()

/**
 * Private variables and functions
 */

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
        docs.push(doc._source)
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

// 查询笔记列表
exports.route('/').post(function(req, res) {
  var limit = Number(req.body.limit) || config.page.limit
  var skip = Number(req.body.skip) || config.page.skip
  var query = req.body.query || ''
  var search = {
    from: skip,
    size: limit,
    query: {
      match: {
        body: query
      }
    },
    highlight: {
      fields: {
        body: {}
      }
    }
  }
  if (query === '') {
    var search = {
      from: skip,
      size: limit
    }
  }
  getES(search, function(data) {
    res.send({
      total: data.total,
      docs: data.docs
    })
  })
})
// .post(function(req, res) {
//   if (!req.body.title) {
//     res.send({
//       error: 'title must be specified!'
//     })
//     return
//   }

//   NOTES.getNextID(function(err, ID) {
//     if (err) {
//       res.send({
//         error: err
//       })
//       return
//     }

//     var data = {
//       ID: ID,
//       title: req.body.title,
//       body: req.body.body,
//       uuids: req.body.uuids
//     }

//     new NOTES(data).save(function(err, data) {
//       if (err) {
//         res.send({
//           error: 'Create NOTES failed!'
//         })
//         return
//       }
//       res.send(data)
//     })
//   })
// })

//查询＆修改
exports
  .route('/modify/:id')
  .get(function(req, res) {
    if (!req.params.id) {
      res.send({
        error: 'params error!'
      })
    }
    var ID = req.params.id
    var condition = { ID: ID }

    NOTES.findOne(condition)
      .select('-_id')
      .exec(function(err, data) {
        if (err || !data) {
          res.send({
            error: 'Data does not exist!'
          })
          return
        }
        res.send(data)
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
          error: 'Data does not exist!'
        })
        return
      }
      // 置顶，修改ID
      if (req.body.top) {
        NOTES.getNextID(function(err, ID) {
          if (err) {
            res.send({
              error: err
            })
            return
          }
          mixin(data, { ID: ID })
          data.save(function(err, data) {
            if (err) {
              res.send({
                error: 'Save data failed!'
              })
              return
            }
            res.send(data)
          })
        })
      } else {
        mixin(data, req.body)
        data.save(function(err, data) {
          if (err) {
            res.send({
              error: 'Save data failed!'
            })
            return
          }
          res.send(data)
        })
      }
    })
  })

//删除数据
exports.route('/delete/:id').get(function(req, res) {
  if (!req.params.id) {
    res.send({
      error: 'params error!'
    })
  }
  NOTES.findOne({ ID: req.params.id }).exec(function(err, data) {
    if (err || !data) {
      res.send({
        error: 'Data does not exist!'
      })
      return
    }
    IMAGES.remove({ uuid: { $in: data.uuids } }, function(err0, data0) {
      if (err0) {
        res.send({
          error: 'Delete images failed!'
        })
      } else {
        console.log('删除图片成功！')
        data.remove(function(err, data) {
          if (err) {
            res.send({
              error: 'Delete data failed!'
            })
          }
          console.log('删除笔记成功')
          res.send(data)
        })
      }
    })
  })
})

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
