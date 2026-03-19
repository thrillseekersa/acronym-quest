const { GoogleGenerativeAI } = require('@google/generative-ai');
const API_KEY = "AIzaSyDcWaopzUiC2mwycP1EmEjxDdCuar7gdak";

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(data.models.map(m => m.name).join('\n'));
}
run();
