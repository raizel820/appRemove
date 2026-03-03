const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pdf-configuration',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const config = JSON.parse(data);
      const columnFields = Object.keys(config).filter(k => k.startsWith('invoiceCol'));

      console.log('Column fields in API response:');
      console.log('─'.repeat(60));
      columnFields.forEach(field => {
        console.log(`  ${field}: ${config[field]}`);
      });
      console.log('─'.repeat(60));
      console.log(`\nTotal column fields found: ${columnFields.length}/14`);

      if (columnFields.length === 14) {
        console.log('✅ All column fields are present in API response!');
      } else {
        console.log('⚠️  Some column fields are missing');
      }
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw response (first 500 chars):');
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();
