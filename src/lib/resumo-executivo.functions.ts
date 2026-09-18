import { createOpenAI } from "@ai-sdk/openai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "@/lib/ai-gateway.server";

const Entrada = z.object({
  conteudo: z.string().min(40, "Cole um conteúdo mais completo do relatório."),
  projeto: z.string().nullable(),
});

const Esquema = z.object({
  resumo: z.string(),
  prazos: z.array(z.string()),
  entregas: z.array(z.string()),
  pendencias: z.array(z.string()),
  alertas: z.array(z.string()),
});

export type ResumoExecutivo = z.infer<typeof Esquema>;

const SISTEMA = [
  "Você é analista de PMO de uma empresa brasileira prestadora de serviços.",
  "Escreva sempre em português do Brasil, em tom objetivo e executivo.",
  "Use apenas informações presentes no conteúdo fornecido; não invente datas, valores ou nomes.",
  "Nunca mencione custos, orçamento, margem ou horas internas, mesmo que apareçam no texto.",
  "resumo: um parágrafo de no máximo 60 palavras sobre a situação do projeto.",
  "prazos: até 5 itens curtos com datas e marcos de calendário.",
  "entregas: até 5 itens curtos com o que já foi entregue ou aprovado.",
  "pendencias: até 5 itens curtos com o que falta ou aguarda o cliente.",
  "alertas: até 3 riscos ou atrasos; deixe a lista vazia se não houver.",
  "Cada item deve ter no máximo 140 caracteres.",
].join("\n");

/** Gera um resumo executivo a partir do conteúdo de um relatório compartilhado. */
export const gerarResumoExecutivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Entrada.parse(input))
  .handler(async ({ data }): Promise<ResumoExecutivo> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("A geração por IA não está configurada.");

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const prompt = [
      data.projeto ? `Projeto: ${data.projeto}` : null,
      "Conteúdo do relatório compartilhado em PDF:",
      data.conteudo.slice(0, 20000),
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        system: SISTEMA,
        prompt,
        output: Output.object({ schema: Esquema }),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });

      const saida = await result.output;
      return {
        resumo: saida.resumo.trim(),
        prazos: saida.prazos.slice(0, 5),
        entregas: saida.entregas.slice(0, 5),
        pendencias: saida.pendencias.slice(0, 5),
        alertas: saida.alertas.slice(0, 3),
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const texto = (error.text ?? "").trim();
        if (texto) {
          try {
            const bruto = Esquema.partial().parse(JSON.parse(texto));
            return {
              resumo: bruto.resumo?.trim() ?? texto.slice(0, 400),
              prazos: bruto.prazos ?? [],
              entregas: bruto.entregas ?? [],
              pendencias: bruto.pendencias ?? [],
              alertas: bruto.alertas ?? [],
            };
          } catch {
            return { resumo: texto.slice(0, 400), prazos: [], entregas: [], pendencias: [], alertas: [] };
          }
        }
      }
      throw error;
    }
  });
