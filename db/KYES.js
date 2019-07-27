/**
 * Dependencies
 */
var mongoose = require('mongoose')

/**
 * Private variables and functions
 */
var Schema = mongoose.Schema
// var lastID = 0;
/**
 * Exports
 */
var schema = new Schema(
  {
    //IMAGES参数
    keyword: { type: String, require: true },
    nums: { type: Number, require: true, default: 0 }
  },
  { collection: 'KEYS' }
)

module.exports = mongoose.model('KEYS', schema)
