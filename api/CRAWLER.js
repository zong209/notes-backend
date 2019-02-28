/**
 * Dependencies
 */
var express = require('express');
// var mixin = require('utils-merge');
var config = require('../config');
var https=require('https')
var Crawler = require("crawler");
var cheerio = require('cheerio')
// const fs = require('fs');
var Entities = require('html-entities').XmlEntities;

const entities = new Entities();

function getPageHtml(str,imgProcess){
    // var REG_BODY = /<hr[^>]*>([\s\S]*)<\hr>/;
    // var body = new String(REG_BODY.exec(str));
    var body=str.replace(/(^\s*)|(\s*$)/g, "");
    var reg=/(<code>[\s\S]+?)([\n]{2,})+([\s\S]+?<\/code>)/g
    // var reg=/(<code>[\s\S]+?)(\n)+(\#\#[\s\S]+?<\/code>)/g
    body=body.replace(reg,'$1\n'+"$3")
    if (imgProcess){
        body=imgBlockProcess(body)
    }
    body=entities.decode(body)
    return body
}

//图片块处理
function imgBlockProcess(str){
    var reg=/\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-filesize=\"[\s\S\n]*?<\/div>\n<\/div>/g
    // var temp=str.match(reg)
    str=str.replace(reg,'<div><img src="http://'+'$1'+'"></div>')
    return str 
}

//csdn图片处理
function csdnImg(str){
    var reg=/\<img[\s\S]*?src=\"([\S]*?)\"[\s\S]*?>/g
    var urls=reg.exec(str)
    urls.forEach(url => {
        picCrawler(url)
    });
    return(str)
}

var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
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
                var pageMd=getPageHtml(page,true)
                resolve(pageMd)
            }
            done();
        }
    }])
})
}

function picCrawler(url){
    return new Promise(function(resolve,reject){
        https.get(url,function(res){
            var datas = [];
            var size = 0;
            res.on('data', function(data){
                datas.push(data);
                size += data.length;
            })
            res.on('end', function(data){
                var buff = Buffer.concat(datas, size);
                var pic = buff.toString('base64');
                resolve({success:true, data:pic});
            })
        }).on('error',function(err){
            // console.log('获取验证码异常,异常原因'+err);
            reject({success:false, msg:'获取图片失败'});
        })
    })
}

var str='<figure class="image"><img alt="日期加减一天测试" height="128" src="https://img-blog.csdnimg.cn/20190213174238452.png" width="419"><figcaption></figcaption></figure><p>添加一天如下：</p><figure class="image"><img alt="日期加减一天测试" height="128" src="https://img-blog.csdnimg.cn/20190213174238452.png" width="419"><figcaption></figcaption></figure><p>添加一天如下：</p>'
csdnImg(str)

function csdnCrawler(url){
    return new Promise(function(resolve,reject){
        c.queue([{uri: url,jQuery: false,timeout:1000,retries:1,retryTimeout:1000,callback:function (error, res, done) {
            if(error){
                // console.log(error);
                reject('failed')
            }else{
                let $ = cheerio.load(res.body);
                let page=new String($('.htmledit_views').html())
                var pageMd=getPageHtml(page,false)
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

exports.route('/csdn').get(function(req, res) {
    var url = req.query.url;
    if(!url){
        res.send({
            'error':'url is required'
        })
    }else{
        csdnCrawler(url).then(function(resp){
            res.send({'status':true,'resp':resp})
        }).catch(function(resp){
            res.send({'status':false,'resp':resp})
        })
    }
})