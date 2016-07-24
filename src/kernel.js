var koa = require('koa');
var uuid = require('./uuid');
var hash = require('./key_value');

const PORT = 8080;

function reFromGlob(glob) {
  console.log('Glob: ', glob);
  var re = '^' + glob.replace(/\./g, '\\.').replace('*', '.*') + '$';
  console.log('Glob: ' + glob + ' re ' + re);
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
  if (items)
    rules.push({ service: items[1], glob: items[2] });
}

var app = koa();

app.use(function *() {
  var reqUuid = uuid();
  var host = this.request.host;
  var path = this.request.path;
  var ruleIndex = 0;

  var body = '';

  for (ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
    var rule = rules[ruleIndex];
    if (globMatches(rule.glob, host, path)) {
      body += '<p>Matches: ' + rule.glob + ' -> ' + rule.service + '</p>';
    }
  }

  this.body = body;
});

app.listen(3001);
