const { GoogleGenerativeAI } = require('@google/generative-ai');
const API_KEY = "AIzaSyDcWaopzUiC2mwycP1EmEjxDdCuar7gdak";
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello?");
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}
run();
