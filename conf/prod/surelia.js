var sureliaConf = JSON.parse(require('fs').readFileSync(__dirname + '/../../api/surelia.settings.json', 'utf8'));
if (sureliaConf.options.gearmanServer) {
  sureliaConf.options.gearmanServer = true;
}
var config = {
  imap: {
    host: 'imap.gmail.com',
    port: 993
  },
  smtp: {
    host: 'smtp.gmail.com',
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
