const path = require('path');
const fs = require('graceful-fs');
const csv = require('csv-parser');
const lruCache = require('lru-cache');

const cache = lruCache(1500000);

const notFoundCache = lruCache({
  max: 10000,
  maxAge: 60,
});

const dataDir = path.resolve(__dirname, '..', 'data');

const lookup = async (areaType, outcode, incode) => {
  // special case for gibraltar
  if (areaType === 'council-area' && /^GX/.test(outcode)) {
    return 'G99999999';
  }

  const cacheKey = `${areaType} ${outcode} ${incode}`;

  if (notFoundCache.has(cacheKey)) return null;

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(path.join(dataDir, areaType, `${outcode}.csv`))
      .on('error', (error) => {
        if (error.code === 'ENOENT') {
          notFoundCache.set(cacheKey, true);
          resolve(null);
        }
      });

    let found = false;
    stream.pipe(csv())
      .on('data', (data) => {
        cache.set(`${areaType} ${outcode} ${data.incode}`, data.value);
        if (incode === data.incode) {
          found = true;
          resolve(data.value);
        }
      })
      .on('error', reject)
      .on('end', () => {
        if (!found) {
          notFoundCache.set(cacheKey, true);
        }
        resolve(null);
      })
    ;
  });
};

module.exports = lookup;
