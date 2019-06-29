/**
 * Dependencies
 */
var express = require('express');
var mixin = require('utils-merge');
var config = require('../config');

var db = require('../db/index');
/**
 * NOTES
 */

var NOTES = db.NOTES;

/**
 * Exports
 */
module.exports = exports = express.Router();

/**
 * Private variables and functions
 */
// 处理文档标签
function cleanFlag(str){
    var reg=/<[\s\S]*?>/g
    str=str.replace(reg,'')
    return str
}

// NOTES management 
exports.route('/').get(function(req, res) {
    var searchText = req.query.search
    NOTES.find().count().then(function(total){
        NOTES.find().select('-_id').sort({'submittime':-1}).exec(function(err, docs) {
            if (err) {
                res.send({
                    error: 'Get docs list failed!'
                });
                return;
            }
            if(!searchText){
                res.send({"total":total,'docs':docs});
            }else{
                var result=[]
                docs.forEach((doc,index) => {
                    result.push({'ID':doc.ID,'body':cleanFlag(doc.title+doc.body)})
                });
                res.send({"total":total,'docs':result});
            }
        });
    });

})