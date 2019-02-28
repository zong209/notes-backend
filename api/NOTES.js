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

// NOTES management 
exports.route('/').get(function(req, res) {
    var limit = Number(req.query.limit) || config.page.limit;
    var skip = Number(req.query.skip) || config.page.skip;

    NOTES.find().count().then(function(total){
        NOTES.find().select('-_id').sort('-ID').limit(limit).skip((skip-1)*limit)
        .exec(function(err, docs) {
            if (err) {
                res.send({
                    error: 'Get docs list failed!'
                });
                return;
            }
            res.send({"total":total,'docs':docs});
        });
    })
}).post(function(req, res) {
    if (!req.body.title) {
        res.send({
            error: 'title must be specified!'
        });
        return;
    }

    NOTES.getNextID(function(err, ID) {
        if (err) {
            res.send({
                error: err
            });
            return;
        }

        var data = {
            ID: ID,
            title: req.body.title,
            body:req.body.body
        };

        (new NOTES(data)).save(function(err, data) {
            if (err) {
                res.send({
                    error: 'Create NOTES failed!'
                });
                return;
            }
            res.send(data);
        });
    });
});

//查询＆修改
exports.route('/modify/:id').get(function(req, res) {
    if(!req.params.id){
        res.send({
            error:'params error!'
        })
    }
    var ID=req.params.id
    var condition = {'ID':ID};

    NOTES.findOne(condition).select('-_id').exec(function(err, data) {
        if (err || !data) {
            res.send({
                error: 'Data does not exist!'
            });
            return;
        }
        res.send(data);
    })
}).post(function(req,res){
    if(!req.params.id){
        res.send({
            error:'params error!'
        })
    }
    NOTES.findOne({ 'ID': req.params.id }).exec(function(err, data) {
        if (err || ! data) {
            res.send({
              error: 'Data does not exist!'
            });
            return;
        }
        mixin(data,req.body)
        data.save(function (err, data) {
            if (err) {
                res.send({
                error: 'Save data failed!'
                });
                return;
            }
            res.send(data);
        });
    })
})

//删除数据
exports.route('/delete/:id').get(function(req, res) {
    if(!req.params.id){
        res.send({
            error:'params error!'
        })
    }
    NOTES.findOne({ 'ID': req.params.id }).exec(function(err, data) {
        if (err || ! data) {
            res.send({
              error: 'Data does not exist!'
            });
            return;
        }
        data.remove(function (err, data) {
            if (err) {
              res.send({
                error: 'Delete data failed!'
              });
            }
            res.send(data);
        });
    })
})

// 批量ID查询
exports.route('/batch').post(function(req, res) {
    var limit = Number(req.query.limit) || config.page.limit;
    var skip = Number(req.query.skip) || config.page.skip;

    var IDs=req.body.ids
    var condition={'ID':{$in:IDs}}
    NOTES.find(condition).select('-_id').sort({'ID':-1}).limit(limit).skip((skip-1)*limit)
    .exec(function(err, docs) {
        if (err) {
            res.send({
                error: 'Get docs list failed!'
            });
            return;
        }
        res.send({"total":IDs.length,'docs':docs});
    });
})