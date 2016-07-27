var koa = require('koa');

var uuid = require('./uuid');
var hash = require('./key_value');
var middleware = require('./middleware');

const PORT = 8080;

function reFromGlob(glob) {
  var re = '^' + glob.replace(/\./g, '\\.').replace('*', '.*') + '$';
  return new RegExp(re);
}

var GLOB_RE = /^.*?\:\/\/(.*?)\/(.*)$/;
function globMatches(glob, host, path) {
  var m = glob.match(GLOB_RE);

  var hostGlob = m[1];
  var pathGlob = m[2];

  var hostRe = reFromGlob(hostGlob);
  var pathRe = reFromGlob(pathGlob);

  return (host || '').match(hostRe) && (path || '').match(pathRe);
}

var fs = require('fs');
var ruleLines = fs.readFileSync('routes.rt').toString().split('\n');
var rules = [];

for (var i = 0; i < ruleLines.length; i++) {
  var items = ruleLines[i].match(/^(.*?)\s+(.*?)$/);
  if (items && items[0].indexOf('#') != 0)
    rules.push({ service: items[1], glob: items[2] });
}

var app = koa();

app.use(function *() {
  var reqUuid = uuid();
  this.requestUuid = reqUuid;

  var host = this.request.host;
  var path = this.request.path;
  var ruleIndex = 0;

  for (ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
    var rule = rules[ruleIndex];
    if (globMatches(rule.glob, host, path)) {
      var res = yield middleware(this, rule.service);
      if (res === true) {
        return;
      } else {
        this.internalHeaders = Object.assign(this.internalHeaders || {}, res.addHeaders);
      }
    }
  }

  this.status = 500;
  this.body = 'Server Error - Not Handled';
});

var port = process.env.PORT || PORT;
console.log('Listening on port ' + port);
app.listen(port, '0.0.0.0');
