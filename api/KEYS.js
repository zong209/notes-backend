/**
 * Dependencies
 */
var express = require('express')
var db = require('../db')
var mixin = require('utils-merge')

var KEYS = db.KEYS
var NOTES = db.NOTES
/**
 * Exports
 */
module.exports = exports = express.Router()

/**
 * Private variables and functions
 */

// init Keywords
exports.route('/init').get(function(req, res) {
  NOTES.find({})
    .select('keywords')
    .exec(function(err, data) {
      if (err) {
        res.send({
          code: 501,
          success: false,
          msg: 'get notes keywords failed'
        })
      } else {
        var keysArray = []
        data.forEach(function(value) {
          keysArray = keysArray.concat(value.keywords)
        })
        var keySets = new Set(keysArray)
        keySets.delete('')

        // 统计每类别数量
        var documents = []
        keySets.forEach(function(key) {
          documents.push(
            new KEYS({
              keyword: key,
              nums: keysArray.filter(item => {
                return item === key
              }).length
            })
          )
        })
        KEYS.deleteMany({}, () =>
          KEYS.insertMany(documents)
            .then(() => {
              res.send({ code: 200, success: true, msg: 'initial success' })
            })
            .catch(() => {
              res.send({ code: 501, success: false, msg: 'initial failed' })
            })
        )
      }
    })
})

// 获取关键词列表
exports.route('/list').get((req, res) => {
  KEYS.find()
    .select('keyword nums -_id')
    .exec((err, data) => {
      if (err) {
        res.send({ code: 501, success: false, msg: 'get keywords list failed' })
      } else {
        res.send({ code: 200, success: true, keywordsList: data })
      }
    })
})

// // NOTES management
// exports.route('/').post(function(req, res) {
//   if (!req.body.image || !req.body.blogId) {
//     res.send({
//       error: 'image string must be specified!'
//     })
//     return
//   }
//   new KEYS({
//     uuid: uuid.v4(),
//     base64image: new String(req.body.image).replace(/^data[\s\S]*?\,/, '')
//   }).save(function(err, imgData) {
//     if (err) {
//       res.send({ success: false, msg: 'save image failed' })
//     } else {
//       //id存入NOTES
//       NOTES.findOne({ ID: req.body.blogId }).exec(function(err, data) {
//         if (err || !data) {
//           res.send({
//             error: 'Data does not exist!'
//           })
//           return
//         }
//         var newData = [imgData.uuid]
//         data.uuids.forEach(uuid => {
//           newData.push(uuid)
//         })
//         mixin(data, { uuids: newData })
//         data.save(function(err, data) {
//           if (err) {
//             res.send({
//               error: 'Save data failed!'
//             })
//             return
//           }
//           res.send({ success: true, data: imgData.uuid })
//         })
//       })
//     }
//   })
// })

// //查询
// exports.route('/:id').get(function(req, res) {
//   if (!req.params.id) {
//     res.send({
//       error: 'params error!'
//     })
//   }
//   var id = req.params.id
//   var condition = { uuid: id }

//   KEYS.findOne(condition)
//     .select('-_id')
//     .exec(function(err, data) {
//       if (err || !data) {
//         res.send({
//           error: 'Data does not exist!'
//         })
//         return
//       }
//       res.setHeader('Content-Type', 'image/jpg')
//       res.write(data.base64image, 'base64')
//       res.end()
//     })
// })
