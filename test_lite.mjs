import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testModel(modelName) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
    });
    const data = await response.json();
    console.log(`\n--- Test: ${modelName} ---`);
    if (data.error) {
        console.log(`Error: ${data.error.code} - ${data.error.message}`);
    } else {
        console.log(`Success! Response: ${data.candidates[0].content.parts[0].text}`);
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
    await testModel('gemini-2.0-flash-lite-001');
    await testModel('gemini-2.5-flash-lite');
}
run();
