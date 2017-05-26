const path = require('path');
const http = require('http');
const url = require('url');
const fs = require('graceful-fs');
const logger = require('@financial-times/n-logger').default;
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

// regex for matching API requests
const apiPathMatch = new RegExp(`^/v1/(${areaTypes.join('|')})$`);

// helper for normalizing and parsing a postcode into "outcode" and "incode"
const parsePostcode = (_postcode) => {
  const postcode = _postcode.replace(/\s+/g, '').toUpperCase();
  return [postcode.slice(0, -3), postcode.slice(-3)];
};

// http request handler
const handler = async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  switch (pathname) {
    case '/__gtg':
      res.end('ok');
      return;

    case '/':
      res.writeHead(302, { Location: '/v1' });
      res.end();
      return;

    case '/v1':
      res.end(docPageHTML);
      return;

    default: {
      const matched = apiPathMatch.exec(pathname);
      if (!matched) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      // helper for sending an JSON response
      const sendResponse = (status, data) => {
        res.statusCode = status;
        res.end(JSON.stringify(Object.assign({ status }, data)));
      };

      const areaType = matched[1];

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'max-age=31536000, immutable');
      res.setHeader('Content-Type', 'application/json');

      // read the postcode from the query string
      const postcode = query.postcode;

      if (!postcode) {
        sendResponse(400, { message: 'Missing "postcode" parameter' });
        return;
      }

      if (postcode.length < 4) {
        sendResponse(400, { message: '"postcode" parameter too short' });
        return;
      }

      // normalize and parse it into outcode and incode (that's what the first and
      // second bits of a UK postcode are called)
      const [outcode, incode] = parsePostcode(postcode);

      // try to look it up
      let value;
      try {
        value = await lookup(areaType, outcode, incode);
      } catch (error) {
        logger.error('Unexpected error during postcode lookup', error);
        sendResponse(500, { message: 'Internal server error' });
      }

      if (value) {
        sendResponse(200, {
          value,
          postcode: `${outcode} ${incode}`,
          type: areaType,
        });

        return;
      }

      sendResponse(400, { message: `Postcode not known: ${outcode} ${incode}` });
    }
  }
};

const server = http.createServer(handler);

const port = process.env.PORT || '9999';

server.listen(port, () => {
  logger.info(`Listening on port ${port}/`);
});
