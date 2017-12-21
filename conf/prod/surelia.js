var sureliaConf = JSON.parse(require('fs').readFileSync(__dirname + '/../../api/surelia.settings.json', 'utf8'));
if (sureliaConf.options.gearmanServer) {
  sureliaConf.options.gearmanServer = true;
}
var config = {
  imap: {
    host: 'pnsmail.go.id',
    port: 993
  },
  smtp: {
    host: 'pnsmail.go.id',
    port: 465 
  },
  lang : "id",
  gearman : sureliaConf.options.gearmanServer,
  spamFolder : "Spam",
  imapUsernamePrefix : '',
  appName : 'Surelia',
  mainDomain : 'domain.com'
}

module.exports = config;
