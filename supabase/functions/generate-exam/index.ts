import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!AI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { subject, subtopics, numQuestions } = await req.json();

    if (!subject || !numQuestions) {
      return new Response(
        JSON.stringify({ error: "subject and numQuestions are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicsText = subtopics?.length
      ? `Foque nos seguintes subtópicos: ${subtopics.join(", ")}.`
      : "";

    const systemPrompt = `Você é um gerador de questões para provas e concursos brasileiros. Gere questões de múltipla escolha de alta qualidade, variadas e desafiadoras. Sempre em português do Brasil. Cada questão deve ter exatamente 4 alternativas (A, B, C, D) e apenas uma correta. Retorne APENAS um JSON válido, sem markdown, sem explicação.`;

    const userPrompt = `Gere ${numQuestions} questões de múltipla escolha sobre ${subject}. ${topicsText}

Retorne um JSON com esta estrutura exata:
{
  "questions": [
    {
      "question": "texto da pergunta",
      "options": ["alternativa A", "alternativa B", "alternativa C", "alternativa D"],
      "correctIndex": 0
    }
  ]
}

Onde correctIndex é o índice (0-3) da alternativa correta. Varie a posição da resposta correta. Faça questões no nível de provas como ENEM, concursos públicos e vestibulares.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `AI Gateway error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    // Parse the JSON from the response (handle potential markdown wrapping)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-exam error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
