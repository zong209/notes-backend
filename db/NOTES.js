/**
 * Dependencies
 */
var mongoose = require('mongoose')

/**
 * Private variables and functions
 */
var Schema = mongoose.Schema
var lastID = 0

/**
 * Exports
 */
var schema = new Schema(
  {
    //NOTES参数
    ID: { type: Number, require: true },
    title: { type: String, require: true },
    address: { type: String, default: null },
    body: { type: String, default: null },
    keywords: { type: Array, default: new Array(), required: true },
    submittime: { type: Date, required: true, default: new Date() },
    uuids: { type: Array, default: new Array(), required: true }
  },
  { collection: 'NOTES' }
)

schema.static('getNextID', function(callback) {
  if (lastID) {
    lastID = lastID + 1
    if (!lastID) {
      callback('Not enough IDs available!')
      return
    }
    callback(null, lastID)
    return
  }

  this.where({})
    .select('ID')
    .sort('-ID')
    .findOne(function(err, data) {
      if (err) {
        callback(err)
        return
      }

      if (!data) {
        // Starting with 1 instead of 0 makes more sense to non-programmer
        lastID = 1
        callback(null, lastID)
        return
      }

      lastID = data.ID + 1
      if (!lastID) {
        callback('Not enough IDs available!')
        return
      }
      callback(null, lastID)
      return
    })
})

module.exports = mongoose.model('NOTES', schema)
