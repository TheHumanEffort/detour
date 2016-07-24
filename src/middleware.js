var stream = require('stream');
var hyperquest = require('hyperquest');

function stripPrivateHeaders(headers) {
  var out = {};
  for (var k in headers) {
    if (k.toLowerCase().match(/^x-detour-/) == null)
      out[k] = headers[k];
  }

  return out;
}

function parseAddHeaders(headerString) {
  var out = {};
  var headers = headerString.split(',');

  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].match(/^(.*?)=(.*)$/);
    out[header[1]] = decodeURIComponent(header[2]);
  }

  return out;
}

function pipeOut(external, internal, response) {
  var pipe = new stream.PassThrough();

  external.response.status = response.statusCode;
  external.response.set(stripPrivateHeaders(response.headers));
  external.response.body = pipe;
  internal.pipe(pipe);
}

module.exports = function(external, middleware) {
  // call cb() when we're done processing, with true if we are done
  // and should return.

  var host = external.request.host;
  var path = external.request.path;
  var url = 'http://' + middleware + path;

  //  console.log('Method: ', external.request.method);

  var headers = Object.assign({}, external.request.headers, external.internalHeaders, { host: host });

  //  console.log('Headers: ', headers);

  var options = { headers: headers,
                  method: external.request.method,
                };

  var internal = hyperquest(url, options);

  if (external.request.method != 'GET') {
    external.req.pipe(internal);
  }

  return function(cb) {
    internal.on('response', function(response) {
      //      console.log('Path: ' + external.path);
      //      console.log('CODE: ', response.statusCode);

      // code hundreds digit:
      var codeSeries = Math.floor(response.statusCode / 100);

      if (response.statusCode == 404) {
        // if we have a 404, keep passing down the chain:
        cb(null, false);
      } else if (5 == codeSeries || 3 == codeSeries) {
        // if we have a 5** error or 3** redirect, throw it back out -
        // if we have any errors in the chain, the safest bet is to
        // barf.  We can come up with a more reasonable responses
        // later.  Redirects should be served.
        pipeOut(external, internal, response);
        cb(null, true);
      } else if (2 == codeSeries) {
        // normal operation, check headers for stuff:
        //        console.log('Headers: ', response.headers);

        if (response.headers['x-detour-continue'] == 'true') {
          cb(null, { addHeaders: parseAddHeaders(response.headers['x-detour-add-headers']) });
        } else {
          pipeOut(external, internal, response);
          cb(null, true);
        }
      }

      cb(null, true);
    });

    internal.on('error', function(error) {
      //      console.log('ERROR: ', error);
      external.body = 'Error!';
      cb(null, true);
    });
  };
};
