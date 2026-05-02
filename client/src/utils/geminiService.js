/**
 * Service to interact with Google Gemini AI for message translation and mastery.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function translateToEnglish(text) {
  if (!text || !text.trim()) return text;

  if (!GEMINI_API_KEY) {
    console.error("Master English Error: Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env or Vercel settings.");
    return text;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Translate the following text into natural, fluent, and casual English suitable for a chat conversation. If it's already in English, just improve the grammar and make it sound more native. Return ONLY the translated/improved text: "${text}"` 
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    // Sometimes AI adds quotes, let's strip them
    return result ? result.replace(/^"|"$/g, '') : text;
  } catch (error) {
    console.error("Master English Error:", error);
    return text; // Fallback to original text on error
  }
}
