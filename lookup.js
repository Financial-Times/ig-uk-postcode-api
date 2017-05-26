const fs = require('graceful-fs');
const csv = require('csv-parser');
const lruCache = require('lru-cache');

const cache = lruCache(1500000);

const notFoundCache = lruCache({
  max: 10000,
  maxAge: 60
});

const lookup = async (areaType, outcode, incode) => {
  // special case
  if (areaType === 'council-area' && /^GX/.test(outcode)) {
    return 'G99999999';
  }

  const cacheKey = `${areaType} ${outcode} ${incode}`;

  if (notFoundCache.has(cacheKey)) return null;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(`data/${areaType}/${outcode}.csv`);

    stream.pipe(csv())
      .on('data', (data) => {
        cache.set(outcode + ' ' + data.pc, data.ca);
      });
  });
};

module.exports = lookup;
