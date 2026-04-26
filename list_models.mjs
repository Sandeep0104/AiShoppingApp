import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
    const data = await response.json();
    console.log("AVAILABLE MODELS:");
    if (!data.models) {
        console.log(data);
        return;
    }
    data.models.forEach(m => {
        if (m.name.includes('flash') || m.name.includes('gemini-1.5') || m.name.includes('gemini-2.0')) {
            console.log(m.name);
        }
    });
  } catch (e) {
    console.error(e);
  }
}

listModels();
