// Netlify Function: actúa como intermediario seguro entre el navegador y la API de Gemini (gratis).
// La API key vive acá (variable de entorno en Netlify), nunca en el HTML/JS del navegador.

exports.handler = async function (event) {
  // Solo aceptamos POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta configurar GEMINI_API_KEY en Netlify" })
    };
  }

  try {
    const { system, messages } = JSON.parse(event.body);

    // Gemini usa "contents" con roles "user"/"model" en vez de "user"/"assistant"
    const geminiContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const model = "gemini-2.5-flash"; // modelo gratuito recomendado

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: geminiContents,
          generationConfig: { maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Error de la API de Gemini" })
      };
    }

    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text).join(' ').trim() || '';

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno: " + err.message })
    };
  }
};
