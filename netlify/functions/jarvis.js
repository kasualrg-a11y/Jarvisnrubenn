// Netlify Function: actúa como intermediario seguro entre el navegador y la API de Groq (gratis).
// La API key vive acá (variable de entorno en Netlify), nunca en el HTML/JS del navegador.

exports.handler = async function (event) {
  // Solo aceptamos POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" })
    };
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta configurar GROQ_API_KEY en Netlify" })
    };
  }

  try {
    const { system, messages } = JSON.parse(event.body);

    const groqMessages = [
      { role: "system", content: system },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Error de la API de Groq" })
      };
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || '';

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
