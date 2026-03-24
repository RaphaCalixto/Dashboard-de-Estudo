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

    const { subject, subtopics, numQuestions, studyContext } = await req.json();

    if (!subject || !numQuestions || !studyContext) {
      return new Response(
        JSON.stringify({ error: "subject, numQuestions and studyContext are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicsText = subtopics?.length
      ? `Foque nos seguintes subtopicos: ${subtopics.join(", ")}.`
      : "";

    const systemPrompt = `Voce e um gerador de questoes para provas e concursos brasileiros. Gere questoes de multipla escolha de alta qualidade, variadas e desafiadoras. Sempre em portugues do Brasil. Cada questao deve ter exatamente 4 alternativas (A, B, C, D) e apenas uma correta. Use SOMENTE o conteudo de estudo enviado pelo usuario como base factual. Nao invente temas fora do conteudo-base. Retorne APENAS um JSON valido, sem markdown, sem explicacao.`;

    const userPrompt = `Gere ${numQuestions} questoes de multipla escolha sobre ${subject}. ${topicsText}

Base de estudo obrigatoria:
${studyContext}

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

Onde correctIndex e o indice (0-3) da alternativa correta. Varie a posicao da resposta correta. Faca questoes no nivel de provas como ENEM, concursos publicos e vestibulares. Nao use fatos externos que nao estejam na base de estudo acima.`;

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
          JSON.stringify({ error: "Limite de requisicoes excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Creditos insuficientes. Adicione creditos ao workspace." }),
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
