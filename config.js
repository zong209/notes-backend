module.exports = {
  // host: 'htdq.ansi.space', // Hostname of IoTgo platform
  db: {
    uri: 'mongodb://127.0.0.1:32001/NOTES' // MongoDB database address
  },
  page: {
    limit: 5,
    skip: 0
  },
  basehost: 'http://127.0.0.1:9090',
  elasticSearchUrl: 'http://127.0.0.1:9200/',
  imageServerApi: 'http://127.0.0.1:3000/api/images/add',
  imageDeleteApi: 'http://127.0.0.1:3000/api/images/delete',
  imageServe: '/api/images/look/',
  csdnHome: 'https://blog.csdn.net/',
  // csdnHome: 'https://bbs.nubia.cn/',
  csdnKey: '3000176000856006061501533003690027800375'
}
