import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDataLonga } from "@/lib/enzova";
import { BotaoPrimario, Pill, Vazio } from "@/components/kit";
import {
  baixarAnexoPortal,
  enviarAnexos,
  usePortalComentarEntrega,
  usePortalMarcoComentarios,
  type AnexoComentario,
  type ComentarioEntrega,
} from "@/lib/portal";

function tamanhoLegivel(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const caixaTexto =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20";

function Anexos({ anexos, abrir }: { anexos: AnexoComentario[]; abrir: (id: string, nome: string) => void }) {
  if (!anexos.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {anexos.map((a) => (
        <button
          key={a.id}
          onClick={() => abrir(a.id, a.nome)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[11.5px] font-medium transition hover:border-brand/40 hover:text-brand"
        >
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{a.nome}</span>
          <span className="text-muted-foreground">{tamanhoLegivel(a.tamanho)}</span>
        </button>
      ))}
    </div>
  );
}

function Mensagens({
  comentarios,
  abrir,
}: {
  comentarios: ComentarioEntrega[];
  abrir: (id: string, nome: string) => void;
}) {
  if (!comentarios.length) {
    return <Vazio titulo="Nenhuma mensagem nesta entrega" descricao="Use o campo abaixo para esclarecer pendências." />;
  }
  return (
    <div className="scroll-slim max-h-72 space-y-2.5 overflow-y-auto pr-1">
      {comentarios.map((c) => (
        <div
          key={c.id}
          className={
            c.do_cliente ? "rounded-xl bg-brand-soft px-3 py-2.5" : "rounded-xl border border-border bg-card px-3 py-2.5"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {c.autor ?? "Equipe"}
              {c.do_cliente ? <Pill className="ml-1.5 bg-card text-brand-ink">Cliente</Pill> : null}
            </span>
            <span>{fmtDataLonga(c.created_at)}</span>
          </div>
          <p className="mt-1 text-[12.5px] whitespace-pre-line">{c.conteudo}</p>
          <Anexos anexos={c.anexos} abrir={abrir} />
        </div>
      ))}
    </div>
  );
}

function SeletorArquivos({
  arquivos,
  setArquivos,
  desabilitado,
}: {
  arquivos: File[];
  setArquivos: (f: File[]) => void;
  desabilitado: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          setArquivos([...arquivos, ...Array.from(e.target.files ?? [])]);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-medium transition hover:border-brand/40 hover:text-brand"
      >
        <Paperclip className="size-3.5" /> Anexar arquivo
      </button>
      {arquivos.map((a, i) => (
        <span
          key={`${a.name}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-[11.5px]"
        >
          <span className="max-w-40 truncate">{a.name}</span>
          <button onClick={() => setArquivos(arquivos.filter((_, idx) => idx !== i))} aria-label="Remover anexo">
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Conversa de uma entrega no portal do cliente. */
export function ConversaEntregaPortal({ projetoId, marcoId }: { projetoId: string; marcoId: string }) {
  const { data: comentarios = [], isLoading } = usePortalMarcoComentarios(marcoId);
  const comentar = usePortalComentarEntrega(projetoId, marcoId);
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);

  async function abrir(id: string, nome: string) {
    try {
      const url = await baixarAnexoPortal(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(`Não foi possível abrir ${nome}.`);
    }
  }

  async function enviar() {
    if (!texto.trim()) return;
    try {
      await comentar.mutateAsync({ conteudo: texto.trim(), arquivos });
      setTexto("");
      setArquivos([]);
      toast.success("Mensagem enviada para a equipe.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border/70 bg-canvas/60 p-3">
      {isLoading ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Carregando a conversa…
        </div>
      ) : (
        <Mensagens comentarios={comentarios} abrir={abrir} />
      )}

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Dúvidas ou ajustes antes de aprovar esta entrega"
        className={`mt-3 ${caixaTexto}`}
      />
      <SeletorArquivos arquivos={arquivos} setArquivos={setArquivos} desabilitado={comentar.isPending} />
      <BotaoPrimario
        onClick={enviar}
        disabled={comentar.isPending || !texto.trim()}
        className="mt-2 w-full justify-center"
      >
        {comentar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Enviar mensagem
      </BotaoPrimario>
    </div>
  );
}

type LinhaComentario = {
  id: string;
  conteudo: string;
  created_at: string;
  interno: boolean;
  portal_acesso_id: string | null;
  profiles: { nome: string } | null;
  portal_acessos: { nome: string } | null;
  comentario_anexos: (AnexoComentario & { arquivo_path: string })[];
};

/** Conversa de uma entrega para a equipe interna. */
export function ConversaEntregaInterna({ projetoId, marcoId }: { projetoId: string; marcoId: string }) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [interno, setInterno] = useState(false);

  const { data: comentarios = [], isLoading } = useQuery({
    queryKey: ["marco-comentarios", marcoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comentarios")
        .select(
          "id, conteudo, created_at, interno, portal_acesso_id, profiles(nome), portal_acessos(nome), comentario_anexos(id, nome, tipo, tamanho, arquivo_path)",
        )
        .eq("marco_id", marcoId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LinhaComentario[];
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      const anexos = arquivos.length ? await enviarAnexos(projetoId, arquivos) : [];
      const { data, error } = await supabase
        .from("comentarios")
        .insert({
          tenant_id: perfil?.tenant_id ?? "",
          projeto_id: projetoId,
          marco_id: marcoId,
          autor_id: perfil?.id ?? null,
          conteudo: texto.trim(),
          interno,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (anexos.length) {
        const { error: erroAnexos } = await supabase.from("comentario_anexos").insert(
          anexos.map((a) => ({
            tenant_id: perfil?.tenant_id ?? "",
            comentario_id: data.id,
            nome: a.nome,
            arquivo_path: a.arquivo_path,
            tipo: a.tipo,
            tamanho: a.tamanho,
          })),
        );
        if (erroAnexos) throw erroAnexos;
      }
    },
    onSuccess: () => {
      setTexto("");
      setArquivos([]);
      void queryClient.invalidateQueries({ queryKey: ["marco-comentarios", marcoId] });
      toast.success(interno ? "Nota interna registrada." : "Resposta enviada ao cliente.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem."),
  });

  async function abrir(caminho: string, nome: string) {
    try {
      const { data, error } = await supabase.storage.from("anexos").createSignedUrl(caminho, 120);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(`Não foi possível abrir ${nome}.`);
    }
  }

  const lista: ComentarioEntrega[] = comentarios.map((c) => ({
    id: c.id,
    conteudo: c.interno ? `[nota interna] ${c.conteudo}` : c.conteudo,
    created_at: c.created_at,
    autor: c.profiles?.nome ?? c.portal_acessos?.nome ?? "Equipe",
    do_cliente: c.portal_acesso_id !== null,
    anexos: c.comentario_anexos ?? [],
  }));

  return (
    <div className="mt-3 rounded-xl border border-border/70 bg-canvas/60 p-3">
      {isLoading ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Carregando a conversa…
        </div>
      ) : (
        <Mensagens
          comentarios={lista}
          abrir={(id, nome) => {
            const anexo = comentarios.flatMap((c) => c.comentario_anexos ?? []).find((a) => a.id === id);
            if (anexo) void abrir(anexo.arquivo_path, nome);
          }}
        />
      )}

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Responda ao cliente ou registre uma nota interna"
        className={`mt-3 ${caixaTexto}`}
      />
      <label className="mt-2 flex items-center gap-2 text-[12px]">
        <input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} />
        Nota interna (o cliente não vê)
      </label>
      <SeletorArquivos arquivos={arquivos} setArquivos={setArquivos} desabilitado={enviar.isPending} />
      <BotaoPrimario
        onClick={() => enviar.mutate()}
        disabled={enviar.isPending || !texto.trim()}
        className="mt-2 w-full justify-center"
      >
        {enviar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Enviar
      </BotaoPrimario>
    </div>
  );
}
