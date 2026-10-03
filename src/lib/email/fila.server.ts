import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enviarEmail } from "@/lib/email/provider.server";
import { renderizarEmail, type DadosEmail, type TipoEmail } from "@/lib/email/templates";

type ItemFila = {
  id: string;
  tipo: TipoEmail;
  destinatario_email: string;
  destinatario_nome: string | null;
  dados: DadosEmail;
};

type Rpc = (
  fn: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

// As funções da fila ainda não constam nos tipos gerados do Supabase.
const rpc: Rpc = (fn, args) => (supabaseAdmin as unknown as { rpc: Rpc }).rpc(fn, args);

export type ResumoEnvio = { reservados: number; enviados: number; falhas: number };

/** Reserva um lote da fila (public.email_fila) e entrega pelo provedor. */
export async function processarFila(opcoes: {
  appUrl: string;
  limite?: number;
}): Promise<ResumoEnvio> {
  const { data, error } = await rpc("email_fila_reservar", { p_limite: opcoes.limite ?? 20 });
  if (error) throw new Error(`fila de e-mails: ${error.message}`);

  const itens = (data ?? []) as ItemFila[];
  const resumo: ResumoEnvio = { reservados: itens.length, enviados: 0, falhas: 0 };

  for (const item of itens) {
    let resultado;
    try {
      const email = renderizarEmail(item.tipo, item.dados ?? {}, {
        nome: item.destinatario_nome,
        email: item.destinatario_email,
        appUrl: opcoes.appUrl,
      });
      resultado = await enviarEmail({
        para: item.destinatario_email,
        assunto: email.assunto,
        html: email.html,
        texto: email.texto,
        idempotencia: `email_fila:${item.id}`,
      });
    } catch (e) {
      resultado = {
        ok: false as const,
        definitivo: false,
        erro: `erro ao montar o e-mail: ${(e as Error).message}`,
      };
    }

    const { error: erroConcluir } = await rpc("email_fila_concluir", {
      p_id: item.id,
      p_ok: resultado.ok,
      p_erro: resultado.ok ? null : resultado.erro,
      p_definitivo: resultado.ok ? false : resultado.definitivo,
    });
    if (erroConcluir) console.error("email_fila_concluir", item.id, erroConcluir.message);

    if (resultado.ok) resumo.enviados += 1;
    else {
      resumo.falhas += 1;
      // Só o id: nunca registrar endereço ou conteúdo do e-mail nos logs.
      console.warn(
        "e-mail não enviado",
        item.id,
        resultado.definitivo ? "definitivo" : "nova tentativa",
      );
    }
  }
  return resumo;
}
