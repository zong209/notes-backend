/**
 * Dependencies
 */
var express = require('express');
var uuid = require('uuid')
var db = require('../db/index');
var mixin = require('utils-merge');

var IMAGES = db.IMAGES;
var NOTES = db.NOTES;
/**
 * Exports
 */
module.exports = exports = express.Router();

/**
 * Private variables and functions
 */

// NOTES management 
exports.route('/').post(function(req, res) {
    if (!req.body.image || !req.body.blogId) {
        res.send({
            error: 'image string must be specified!'
        });
        return;
    }
    (new IMAGES({"uuid":uuid.v4(),"base64image":new String(req.body.image).replace(/^data[\s\S]*?\,/,'')})).save(function(err,imgData){
        if (err) {
            res.send({'success':false,'msg':"save image failed"})
        }
        else{
            //id存入NOTES
            NOTES.findOne({ 'ID': req.body.blogId }).exec(function(err, data) {
                if (err || ! data) {
                    res.send({
                      error: 'Data does not exist!'
                    });
                    return;
                }
                var newData=[imgData.uuid]
                data.uuids.forEach(uuid => {
                    newData.push(uuid)
                });
                mixin(data,{'uuids':newData})
                data.save(function (err, data) {
                    if (err) {
                        res.send({
                        error: 'Save data failed!'
                        });
                        return;
                    }
                    res.send({'success':true,'data':imgData.uuid})
                });
            })
        }
    })
    // (new IMAGES({'uuid':id,'image':image})).save(function(err,data){
    //     if (err) {
    //         res.send({
    //             error: 'Create NOTES failed!'
    //         });
    //         return;
    //     }
    //     res.send(data.uuid);
    // })
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
        res.setHeader('Content-Type','image/jpg')
        res.write(data.base64image,'base64')
        res.end()
    })
})