const http = require('http');
const url = require('url');
const fs = require('graceful-fs');
const path = require('path');
const lookup = require('./lookup');

// look for data directories to establish what area types there are
const areaTypes = fs.readdirSync(path.resolve(__dirname, '..', 'data'))
  .filter((name) => {
    const stats = fs.statSync(path.resolve(__dirname, '..', 'data', name));
    return stats.isDirectory();
  });

// rough and ready docs page
const docPageHTML = fs.readFileSync(path.join(__dirname, '..', 'help.html'), 'utf8')
  .replace('$AREA_TYPES', areaTypes.join(', '))
  .replace('$EXAMPLES', areaTypes.map(name => {
    const pathname = `/v1/${name}?postcode=se1+9hl`;
    return `<li><a href="${pathname}"><code>${pathname}</code></a></li>`
  }).join(''));

const matchPath = new RegExp(`^/v1/(${areaTypes.join('|')})$`);

const parsePostcode = (_postcode) => {
  const postcode = _postcode.replace(/\s+/g, '').toUpperCase();
  return [postcode.slice(0, -3), postcode.slice(-3)];
};

const handler = async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  // helper for sending a JSON response
  const send = (status, message) => {
    res.statusCode = status;
    res.end(JSON.stringify({
      status,
      message,
    }));
  };

  switch (pathname) {
    case '/__gtg':
      res.end('ok');
      return;

    case '/favicon.ico':
      res.statusCode = 404;
      res.end('Not found');
      return;

    case '/':
      res.writeHead(302, { Location: '/v1' });
      res.end();
      return;

    case '/v1':
      res.end(docPageHTML);
      return;

    default: {
      const matched = matchPath.exec(pathname);

      if (!matched) send(404, `Not found: "${pathname}"`);

      // treating this as an API request
      const areaType = matched[1];

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'max-age=31536000, immutable');
      res.setHeader('Content-Type', 'application/json');

      // read the postcode from the query string
      const postcode = query.postcode;

      if (!postcode) {
        send(400, 'Missing "postcode" parameter');
        return;
      }

      if (postcode.length < 4) {
        send(400, '"postcode" parameter too short');
        return;
      }

      // normalize and parse it into outcode and incode (that's what the first and
      // second bits of a UK postcode are called)
      const [outcode, incode] = parsePostcode(postcode);

      // try to find an answer
      let value;
      try {
        value = await lookup(areaType, outcode, incode);
      } catch (error) {
        send(500, 'Internal error');
      }

      if (value) {
        res.end(JSON.stringify({
          status: 200,
          type: areaType,
          value,
          postcode: `${outcode} ${incode}`,
        }));
        return;
      }

      send(400, `Postcode not known: ${outcode} ${incode}`);
    }
  }
};

const server = http.createServer(handler);

const port = process.env.PORT || '9999';

server.listen(port, () => {
  console.log(`Server listening on: http://localhost:${port}/`);
});
