/**
 * Dependencies
 */
var express = require('express');
// var mixin = require('utils-merge');
var config = require('../config');
var Crawler = require("crawler");
var cheerio = require('cheerio')
// const fs = require('fs');

function getPageHtml(str){
    var REG_BODY = /<hr[^>]*>([\s\S]*)<\hr>/;
    var body = new String(REG_BODY.exec(str));
    var reg=/(<code>[\s\S]+?)(\n)+(\#\#[\s\S]+?<\/code>)/g
    while(body.match(reg)){
        body=body.replace(reg,'$1'+''+"$3")
    }
    return body
}

var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = cheerio.load(res);
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            // console.log($("title").text());
        }
        done();
    }
});

function jianshuCrawler(url){
    return new Promise(function(resolve,reject){
        c.queue([{uri: url,jQuery: false,timeout:1000,retries:1,retryTimeout:1000,callback:function (error, res, done) {
            if(error){
                // console.log(error);
                reject('failed')
            }else{
                let $ = cheerio.load(res.body);
                let page=new String($('.show-content').html())
                var pageMd=getPageHtml(page)
                resolve(pageMd)
            }
            done();
        }
    }])
})
}


/**
 * Exports
 */
module.exports = exports = express.Router();

/**
 * Private variables and functions
 */

// CRAWLER management 
exports.route('/').get(function(req, res) {
    var url = req.query.url;
    if(!url){
        res.send({
            'error':'url is required'
        })
    }else{
        jianshuCrawler(url).then(function(resp){
            res.send({'status':true,'resp':resp})
        }).catch(function(resp){
            res.send({'status':false,'resp':resp})
        })
    }
})
    
    // CRAWLER.find(condition).select('-_id').limit(limit).skip((skip-1)*limit)
    //     .exec(function(err, docs) {
    //         if (err) {
    //             res.send({
    //                 error: 'Get docs list failed!'
    //             });
    //             return;
    //         }
    //         res.send(docs);
    //     });
// }).post(function(req, res) {
//     if (!req.body.title) {
//         res.send({
//             error: 'title must be specified!'
//         });
//         return;
//     }

//     CRAWLER.getNextID(function(err, ID) {
//         if (err) {
//             res.send({
//                 error: err
//             });
//             return;
//         }

//         var data = {
//             ID: ID,
//             title: req.body.title,
//             body:req.body.body
//         };

//         (new CRAWLER(data)).save(function(err, data) {
//             if (err) {
//                 res.send({
//                     error: 'Create CRAWLER failed!'
//                 });
//                 return;
//             }

//             res.send(data);
//         });
//     });
// });
