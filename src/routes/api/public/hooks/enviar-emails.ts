import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Envio periódico da fila de e-mails ao cliente. Chamado a cada minuto pelo pg_cron
 * (ver public.email_agendar_envio, migração 0030) com `Authorization: Bearer LOVABLE_CRON_SECRET`.
 */
export const Route = createFileRoute("/api/public/hooks/enviar-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const negado = await authenticateCronRequest(request);
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
