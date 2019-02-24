var express = require('express');
var config = require('../config');
var db = require('../db/index');

/**
 * 数据库路由模型
 */
var NOTES=require('./NOTES');
var CRAWLER=require('./CRAWLER');

/**
 * api
 */
var api = express.Router();

api.use('/NOTES',NOTES);
api.use('/CRAWLER',CRAWLER);

module.exports=api;