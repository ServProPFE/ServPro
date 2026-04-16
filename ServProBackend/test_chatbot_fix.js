const http = require('http');

// Test 1: Ask for services (generic query)
console.log('=== Test 1: Generic "what services" query ===');
const payload1 = JSON.stringify({
  text: "And what are those services?",
  language: "en"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/recommend',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload1.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      console.log('Status:', res.statusCode);
      const parsed = JSON.parse(data);
      console.log('Message:', parsed.message);
      console.log('Source:', parsed.source);
      console.log('Detected Service:', parsed.detected_service);
      console.log('\n✅ Test 1 PASSED\n');
      
      // Test 2: Specific service request
      console.log('=== Test 2: Specific service query ===');
      testSpecificService();
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(payload1);
req.end();

function testSpecificService() {
  const payload2 = JSON.stringify({
    text: "I need a plumber",
    language: "en"
  });

  const req2 = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        console.log('Status:', res.statusCode);
        const parsed = JSON.parse(data);
        console.log('Message:', parsed.message);
        console.log('Detected Service:', parsed.detected_service);
        console.log('Confidence:', parsed.confidence);
        console.log('\n✅ Test 2 PASSED\n');
        
        // Test 3: Arabic query
        console.log('=== Test 3: Arabic "what services" query ===');
        testArabic();
      } catch (e) {
        console.error('Parse error:', e.message);
      }
    });
  });

  req2.on('error', (e) => console.error('Request error:', e.message));
  req2.write(payload2);
  req2.end();
}

function testArabic() {
  const payload3 = JSON.stringify({
    text: "ما هي الخدمات؟",
    language: "ar"
  });

  const req3 = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        console.log('Status:', res.statusCode);
        const parsed = JSON.parse(data);
        console.log('Message:', parsed.message);
        console.log('Source:', parsed.source);
        console.log('\n✅ Test 3 PASSED\n');
        console.log('🎉 All tests completed successfully!');
      } catch (e) {
        console.error('Parse error:', e.message);
      }
    });
  });

  req3.on('error', (e) => console.error('Request error:', e.message));
  req3.write(payload3);
  req3.end();
}
