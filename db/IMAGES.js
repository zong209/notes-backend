/**
 * Dependencies
 */
var mongoose = require('mongoose');

/**
 * Private variables and functions
 */
var Schema = mongoose.Schema;
var lastID = 0;
/**
 * Exports
 */
var schema = new Schema({
    //IMAGES参数
    uuid: { type: String, require: true },
    base64image: { type: String, require: true },
}, { collection: "IMAGES" });


module.exports = mongoose.model('IMAGES', schema);