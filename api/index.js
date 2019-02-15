var express = require('express');
var config = require('../config');
var db = require('../db/index');

/**
 * 数据库路由模型
 */
var NOTES=require('./NOTES');

/**
 * api
 */
var api = express.Router();

api.use('/NOTES',NOTES);

module.exports=api;