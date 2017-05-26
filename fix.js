const glob = require('glob-promise');
const fs = require('graceful-fs');

(async () => {
  const files = await glob('data/*/*.csv');

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    if (!content.startsWith('"pc","ca"\n')) {
      throw new Error(`oops ${file}`);
    }

    fs.writeFileSync(file, ['"incode","value"', content.split('\n').slice(1)].join('\n'));
  }
})();
