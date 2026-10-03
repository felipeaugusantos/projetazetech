/**
 * Textos dos e-mails ao cliente (portal). Funções puras: recebem os dados gravados na fila
 * (public.email_fila.dados) e devolvem assunto, HTML e texto. Nada de conteúdo de mensagem,
 * documento ou custo: só o aviso e o link para o portal, onde o acesso é autenticado.
 */

export type TipoEmail = "convite" | "entrega" | "documento" | "mensagem" | "pesquisa";

export type DadosEmail = {
  empresa?: string;
  projeto_id?: string;
  projeto_nome?: string;
  entrega_nome?: string | null;
  data?: string | null;
};

export type ContextoEmail = {
  nome: string | null;
  email: string;
  appUrl: string;
};

export type EmailRenderizado = { assunto: string; html: string; texto: string };

const COR = "#1f7a52";

export function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Assunto em uma linha só (quebras de linha em cabeçalhos permitiriam injeção de cabeçalho). */
function linhaUnica(valor: string) {
  return valor
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 150);
}

function dataBr(iso?: string | null) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

function primeiroNome(nome: string | null) {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

type Conteudo = {
  assunto: string;
  paragrafos: string[];
  botao: string;
  caminho: string;
};

function conteudo(tipo: TipoEmail, d: DadosEmail): Conteudo {
  const empresa = d.empresa ?? "Sua equipe";
  const projeto = d.projeto_nome ?? "seu projeto";
  const caminhoProjeto = d.projeto_id ? `/portal/${encodeURIComponent(d.projeto_id)}` : "/portal";

  switch (tipo) {
    case "convite":
      return {
        assunto: `${empresa}: seu acesso ao portal do cliente`,
        paragrafos: [
          `${empresa} liberou seu acesso ao portal do cliente. Por lá você acompanha o andamento dos projetos, aprova entregas e conversa com a equipe.`,
          "No primeiro acesso, use este mesmo e-mail e defina a sua senha.",
        ],
        botao: "Acessar o portal",
        caminho: "/acesso-cliente",
      };
    case "entrega": {
      const quando = dataBr(d.data);
      return {
        assunto: `Entrega para sua aprovação · ${projeto}`,
        paragrafos: [
          `A entrega “${d.entrega_nome ?? "nova entrega"}” do projeto ${projeto} está disponível para a sua aprovação${quando ? ` (prevista para ${quando})` : ""}.`,
        ],
        botao: "Ver entrega",
        caminho: caminhoProjeto,
      };
    }
    case "documento":
      return {
        assunto: `Novos documentos em ${projeto}`,
        paragrafos: [`Há novos documentos disponíveis no projeto ${projeto}.`],
        botao: "Ver documentos",
        caminho: caminhoProjeto,
      };
    case "mensagem":
      return {
        assunto: `Nova mensagem da equipe · ${projeto}`,
        paragrafos: [
          d.entrega_nome
            ? `A equipe enviou uma nova mensagem sobre a entrega “${d.entrega_nome}” do projeto ${projeto}.`
            : `A equipe enviou uma nova mensagem no projeto ${projeto}.`,
          "Por segurança, o conteúdo fica no portal.",
        ],
        botao: "Ler mensagem",
        caminho: caminhoProjeto,
      };
    case "pesquisa":
      return {
        assunto: `Como foi o projeto ${projeto}? Conte para a gente`,
        paragrafos: [
          `O projeto ${projeto} foi concluído. Sua opinião nos ajuda a melhorar: a pesquisa leva menos de 2 minutos.`,
        ],
        botao: "Responder pesquisa",
        caminho: caminhoProjeto,
      };
  }
}

export function renderizarEmail(
  tipo: TipoEmail,
  dados: DadosEmail,
  ctx: ContextoEmail,
): EmailRenderizado {
  const c = conteudo(tipo, dados);
  const base = ctx.appUrl.replace(/\/+$/, "");
  const link = `${base}${c.caminho}`;
  const preferencias = `${base}/portal`;
  const empresa = dados.empresa ?? "a equipe do projeto";
  const saudacao = primeiroNome(ctx.nome) ? `Olá, ${primeiroNome(ctx.nome)}.` : "Olá.";
  const rodape = `Você recebe este e-mail porque tem acesso ao portal de ${empresa}. Para parar de receber avisos, desative “Avisos por e-mail” no portal.`;

  const paragrafosHtml = c.paragrafos
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1c2a24;">${escaparHtml(p)}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:#f3f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:28px;">
<tr><td>
<p style="margin:0 0 18px;font-size:13px;font-weight:700;letter-spacing:.04em;color:${COR};">${escaparHtml(empresa.toUpperCase())}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1c2a24;">${escaparHtml(saudacao)}</p>
${paragrafosHtml}
<p style="margin:22px 0;"><a href="${escaparHtml(link)}" style="display:inline-block;background:${COR};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;">${escaparHtml(c.botao)}</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#5a6b63;">Se o botão não funcionar, copie este endereço: <a href="${escaparHtml(link)}" style="color:${COR};">${escaparHtml(link)}</a></p>
<hr style="border:none;border-top:1px solid #e3ebe6;margin:20px 0 14px;">
<p style="margin:0;font-size:11px;line-height:1.5;color:#7a8a82;">${escaparHtml(rodape)} <a href="${escaparHtml(preferencias)}" style="color:#7a8a82;">Abrir o portal</a></p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  const texto = [
    saudacao,
    "",
    ...c.paragrafos.flatMap((p) => [p, ""]),
    `${c.botao}: ${link}`,
    "",
    rodape,
    preferencias,
  ].join("\n");

  return { assunto: linhaUnica(c.assunto), html, texto };
}
