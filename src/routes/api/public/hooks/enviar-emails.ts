import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Autoriza a chamada do agendador. Aceita `EMAIL_CRON_SECRET` (segredo próprio, criado por quem
 * administra o projeto) ou, na falta dele, o `LOVABLE_CRON_SECRET` gerenciado pela plataforma
 * (cujo valor não fica visível). Devolve uma Response de erro, ou null quando autorizado.
 */
async function autorizar(request: Request): Promise<Response | null> {
  const proprio = process.env["EMAIL_CRON_SECRET"];
  if (proprio) {
    const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
    if (token) {
      const { createHash, timingSafeEqual } = await import("node:crypto");
      const resumo = (valor: string) => createHash("sha256").update(valor, "utf8").digest();
      if (timingSafeEqual(resumo(token), resumo(proprio))) return null;
    }
  }
  return authenticateCronRequest(request);
}

/**
 * Envio periódico da fila de e-mails ao cliente. Chamado a cada minuto pelo pg_cron
 * (ver public.email_agendar_envio, migração 0030) com `Authorization: Bearer <segredo>`.
 */
export const Route = createFileRoute("/api/public/hooks/enviar-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const negado = await autorizar(request);
        if (negado) return negado;

        const { emailConfigurado } = await import("@/lib/email/provider.server");
        if (!emailConfigurado()) {
          // Não reserva nada: os e-mails continuam na fila até o provedor ser configurado.
          return Response.json({ error: "provedor de e-mail não configurado" }, { status: 503 });
        }

        const { processarFila } = await import("@/lib/email/fila.server");
        try {
          const appUrl = process.env["APP_URL"] ?? new URL(request.url).origin;
          return Response.json(await processarFila({ appUrl }));
        } catch (error) {
          console.error("enviar-emails", (error as Error).message);
          return Response.json({ error: "falha ao processar a fila" }, { status: 500 });
        }
      },
    },
  },
});
