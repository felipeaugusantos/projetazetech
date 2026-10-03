/**
 * Provedor de envio (Resend, via HTTP: funciona no runtime de borda, sem SMTP).
 * Para trocar de provedor, reimplemente `enviarEmail` mantendo o contrato de retorno.
 *
 * Variáveis de ambiente:
 *   RESEND_API_KEY   chave da API do Resend
 *   EMAIL_FROM       remetente, ex.: "Projeta <avisos@seudominio.com.br>" (domínio verificado no Resend)
 *   EMAIL_REPLY_TO   opcional: para onde vão as respostas do cliente
 */

export type EnvioEmail = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  /** Evita duplicar o e-mail se a mesma tentativa for repetida. */
  idempotencia: string;
};

export type ResultadoEnvio =
  { ok: true; id: string | null } | { ok: false; definitivo: boolean; erro: string };

export function emailConfigurado() {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["EMAIL_FROM"]);
}

export async function enviarEmail(envio: EnvioEmail): Promise<ResultadoEnvio> {
  const chave = process.env["RESEND_API_KEY"];
  const de = process.env["EMAIL_FROM"];
  if (!chave || !de)
    return { ok: false, definitivo: false, erro: "provedor de e-mail não configurado" };

  const respostaPara = process.env["EMAIL_REPLY_TO"];

  let resposta: Response;
  try {
    resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
        "Idempotency-Key": envio.idempotencia,
      },
      body: JSON.stringify({
        from: de,
        to: [envio.para],
        subject: envio.assunto,
        html: envio.html,
        text: envio.texto,
        ...(respostaPara ? { reply_to: respostaPara } : {}),
      }),
    });
  } catch (error) {
    return { ok: false, definitivo: false, erro: `falha de rede: ${(error as Error).message}` };
  }

  if (resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: corpo?.id ?? null };
  }

  const detalhe = (await resposta.text().catch(() => "")).slice(0, 300);
  // 400/422: endereço ou conteúdo inválido, repetir não adianta. 401/403/429/5xx: tentar de novo.
  const definitivo = resposta.status === 400 || resposta.status === 422;
  return { ok: false, definitivo, erro: `provedor respondeu ${resposta.status}: ${detalhe}` };
}
