/**
 * Test script for forgot password endpoint
 * Run with: node test-forgot-password.js [email]
 * Example: node test-forgot-password.js user@example.com
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_EMAIL = process.argv[2] || 'test@example.com';

function testForgotPassword() {
  console.log('🧪 Testing Forgot Password Endpoint\n');
  console.log(`API URL: ${API_URL}/api/auth/forgot-password`);
  console.log(`Test Email: ${TEST_EMAIL}\n`);

  const url = new URL(`${API_URL}/api/auth/forgot-password`);
  const postData = JSON.stringify({ email: TEST_EMAIL });

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response Headers:', res.headers);
      console.log('\nResponse Body:');
      
      try {
        const parsed = JSON.parse(data);
        console.log(JSON.stringify(parsed, null, 2));
        
        if (parsed.success) {
          console.log('\n✅ Success! Password reset email should be sent.');
          console.log(`📧 Check the email inbox for: ${TEST_EMAIL}`);
        } else {
          console.log('\n❌ Request failed:', parsed.message);
        }
      } catch (e) {
        console.log(data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error occurred:');
    console.error('Error message:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. The server is running on', API_URL);
    console.error('   2. The URL is correct');
    console.error('   3. There are no firewall issues');
  });

  req.write(postData);
  req.end();
}

// Run the test
testForgotPassword();

