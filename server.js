const http = require('http');
const { URL } = require('url');
const lookup = require('./lookup');

const PORT = process.env.PORT || '9999';

const areaTypes = new Set([
  'council-area',
  'westminster-parliamentary-constituency',
]);


const sendError = (res, status, message) => {
  res.statusCode = status;
  res.end(JSON.stringify({
    error: true,
    status,
    message,
  }));
};

const sendAnswer = (res, answer) => {
  res.end(JSON.stringify({
    status: 200,
    answer,
  }));
};

const parsePostcode = (_postcode) => {
  const postcode = _postcode.replace(/\s+/g, '').toUpperCase();
  return [postcode.slice(0, -3), postcode.slice(-3)];
};

const handler = async (req, res) => {
  const url = new URL(req.url);

  if (url.pathname === '/__gtg') {
    res.end('ok');
    return;
  }

  if (url.pathname === '/favicon.ico') {
    sendError(res, 404, 'Not found');
    return;
  }

  if (areaTypes.has(url.pathname)) {
    sendError(res, 404, `Not found: "${url.pathname}"`);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=31536000, immutable');
  res.setHeader('Content-Type', 'application/json');

  // read the postcode from the query string
  const postcode = url.searchParams.postcode;

  // check it looks ok in principle
  if (!postcode) {
    sendError(res, 400, 'Missing "postcode" parameter');
    return;
  }
  if (postcode.length < 4) {
    sendError(res, 400, '"postcode" parameter too short');
    return;
  }

  // parse it
  const [outcode, incode] = parsePostcode(postcode);

  // look up the answer
  let answer;
  try {
    answer = await lookup(url.pathname, outcode, incode);
  } catch (error) {
    sendError(res, 500, 'Internal error');
  }

  if (answer) {
    sendAnswer(res, answer);
    return;
  }

  sendError(res, 404, `Information for postcode "${outcode} ${incode}" not found`);
};

const server = http.createServer(handler);

server.listen(PORT, function(){
  console.log('Server listening on: http://localhost:%s', PORT);
});
