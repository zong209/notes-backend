/**
 * Dependencies
 */
var express = require('express');
// var mixin = require('utils-merge');
var config = require('../config');
var https=require('https')
var http=require('http')
var Crawler = require("crawler");
var cheerio = require('cheerio')

// const fs = require('fs');
var Entities = require('html-entities').XmlEntities;
var upndown = require('upndown');

var und = new upndown();
// 图片接口
var uuid = require('uuid')
var db = require('../db/index');

var IMAGES = db.IMAGES;


const entities = new Entities();

// 去空行处理图片
function getPageHtml(str,name){
    // var REG_BODY = /<hr[^>]*>([\s\S]*)<\hr>/;
    // var body = new String(REG_BODY.exec(str));
    var body=str.replace(/(^\s*)|(\s*$)/g, "");
    var reg=/(<code>[\s\S]+?)([\n]{2,})+([\s\S]+?<\/code>)/g
    // var reg=/(<code>[\s\S]+?)(\n)+(\#\#[\s\S]+?<\/code>)/g
    body=body.replace(reg,'$1\n'+"$3")
    return new Promise(function(resolve,reject){
        if(name){
            csdnImg(body,name).then(function(resp){
                body=entities.decode(resp.body)
                if(name=='jianshu'){
                    //html to markdown
                    und.convert(body,function(err,markdown){
                        if(err){
                            resolve({'uuids':[],'body':'trans markdown error'})
                        }else{
                            resolve({'uuids':resp.uuids,'body':markdown})
                        }
                    })
                }else{
                    resolve({'uuids':resp.uuids,'body':body})
                }

            })
        }
        else{
            resolve({'uuids':[],'body':body})
        }
    })
}

//简书图片块处理
function imgBlockProcess(str){
    var reg=/\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-filesize=\"[\s\S\n]*?<\/div>\n<\/div>/g
    // var temp=str.match(reg)
    str=str.replace(reg,'<div><img src="http://'+'$1'+'"></div>')
    return str 
}

// 上传图片至数据库
function　postImage(data){
    return new Promise(function(resolve,reject){
        (new IMAGES(data)).save(function(err,data){
            if (err) {
                reject({'success':false,'msg':"save image failed"})
            }
            else{
                resolve({'success':true,'data':data})
            }
        })
    })
}

//csdn图片处理
function csdnImg(str,name){
    var resps=[]
    if(name=='csdn' || name=='cnblogs'){
        var reg=/\<img[\s\S]*?src=\"([\S]*?)\"[\s\S]*?>/g
    }
    if(name=='jianshu'){
        var reg=/\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-filesize=\"[\s\S\n]*?<\/div>\n<\/div>/g
    }
    var images=str.match(reg)
    return new Promise(function(resolve,reject){
        if(!images||images.length==0){
            resolve({'uuids':[],'body':str})
        }else{
            images.forEach(image => {
                var url=image.replace(reg,'$1')
                if(name=='cnblogs'&&/^http:\/\//.test(url)){
                    url=url.replace('http','https')
                }
                // if(!/^http:\/\//.test(url)){
                //     url='http://'+url
                // }
                var id=uuid.v4()
                picCrawler(url).then(function(resp){
                    if(resp.success){
                        var data={
                            'uuid':id,
                            'base64image':resp.data
                        }
                        return postImage(data)
                    }
                }).then(function(resp){
                    if(resp.success){
                        resps.push(resp.data.uuid)
                        if(name=='csdn' || name=='cnblogs'){
                            str=str.replace(url,config.basehost+'/api/IMAGES/'+resp.data.uuid)
                        }
                        if(name=='jianshu'){
                            var newReg=/\<div class=\"image-package\">[\s\S\n]*?<img data-original-src=\"\/\/([\S]*)\"[\s\S\n]*?data-original-filesize=\"[\s\S\n]*?<\/div>\n<\/div>/
                            str=str.replace(newReg,'<div><img src="'+config.basehost+'/api/IMAGES/'+resp.data.uuid+'"></div>')
                        }
                        if(resps.length==images.length){
                            resolve({'uuids':resps,'body':str})
                        }
                    }
                })
            });
        }
    })
}

var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
});

//获取图片(http & https)
function picCrawler(url){
    return new Promise(function(resolve,reject){
        if(/^https:\/\//.test(url)){
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
        }else{
            if(!/^http:\/\//.test(url)){
                url='http://'+url
            }
            http.get(url,function(res){
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
        }

    })
}


function pageCrawler(url,name){
    return new Promise(function(resolve,reject){
        c.queue([{uri: url,jQuery: false,timeout:1000,retries:1,retryTimeout:1000,callback:function (error, res, done) {
            if(error){
                // console.log(error);
                reject('failed')
            }else{
                var $ = cheerio.load(res.body);
                if(name=='jianshu'){
                    var page=new String($('.show-content').html())
                }
                if(name=='csdn'){
                    var page=new String($('.htmledit_views').html()||$('.markdown_views').html())
                }
                if(name=='cnblogs'){
                    var page=new String($('.blogpost-body').html())
                }
                getPageHtml(page,name).then(function(resp){
                    resolve(resp)
                })
            }
            done();
            }
        }])
    })
}

// function jianshuCrawler(url){
//     return new Promise(function(resolve,reject){
//         c.queue([{uri: url,jQuery: false,timeout:1000,retries:1,retryTimeout:1000,callback:function (error, res, done) {
//             if(error){
//                 // console.log(error);
//                 reject('failed')
//             }else{
//                 let $ = cheerio.load(res.body);
//                 let page=new String($('.show-content').html())
//                 getPageHtml(page,'jianshu').then(function(body){
//                     resolve(body)
//                 })
//             }
//             done();
//             }
//         }])
//     })
// }

// function csdnCrawler(url){
//     return new Promise(function(resolve,reject){
//         c.queue([{uri: url,jQuery: false,timeout:1000,retries:1,retryTimeout:1000,callback:function (error, res, done) {
//             if(error){
//                 // console.log(error);
//                 reject('failed')
//             }else{
//                 let $ = cheerio.load(res.body);
//                 let page=new String($('.htmledit_views').html())
//                 getPageHtml(page,'csdn').then(function(body){
//                     resolve(body)
//                 })
//             }
//             done();
//         }
//     }])
// })
// }


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
    var name =req.query.name
    if(!url || !name){
        res.send({'error':'url & name is required'})
    }else{
        pageCrawler(url,name).then(function(resp){
            res.send({'status':true,'resp':resp})
        }).catch(function(resp){
            res.send({'status':false,'resp':resp})
        })
    }
})

// exports.route('/csdn').get(function(req, res) {
//     var url = req.query.url;
//     if(!url){
//         res.send({
//             'error':'url is required'
//         })
//     }else{
//         csdnCrawler(url).then(function(resp){
//             res.send({'status':true,'resp':resp})
//         }).catch(function(resp){
//             res.send({'status':false,'resp':resp})
//         })
//     }
// })