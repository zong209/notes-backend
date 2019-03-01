/**
 * Dependencies
 */
var express = require('express');
var uuid = require('uuid')
var db = require('../db/index');

var IMAGES = db.IMAGES;

/**
 * Exports
 */
module.exports = exports = express.Router();

/**
 * Private variables and functions
 */

// NOTES management 
exports.route('/').post(function(req, res) {
    if (!req.body.image) {
        res.send({
            error: 'image string must be specified!'
        });
        return;
    }
    var id=uuid.v4()
    var data={
        'uuid':id,
        'base64image':req.body.image
    }
    (new IMAGES(data)).save(function(err,data){
        if (err) {
            res.send({
                error: 'Create NOTES failed!'
            });
            return;
        }
        res.send(data.uuid);
    })
});

//查询
exports.route('/:id').get(function(req, res) {
    if(!req.params.id){
        res.send({
            error:'params error!'
        })
    }
    var id=req.params.id
    var condition = {'uuid':id};

    IMAGES.findOne(condition).select('-_id').exec(function(err, data) {
        if (err || !data) {
            res.send({
                error: 'Data does not exist!'
            });
            return;
        }
        res.setHeader('Content-Type','image/png')
        res.write(data.base64image,'base64')
        res.end()
    })
})