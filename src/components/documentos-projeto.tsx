import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, EyeOff, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFases } from "@/lib/dados";
import { fmtData } from "@/lib/enzova";
import { BotaoPrimario, Campo, Indicador, Painel, Pill, Vazio, inputClasses } from "@/components/kit";

type Documento = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  arquivo_path: string | null;
  url: string | null;
  tipo: string | null;
  tamanho: number | null;
  visivel_cliente: boolean;
  solicita_portal: boolean;
  aprovacao_status: "pendente" | "aprovado" | "rejeitado";
  fase_id: string | null;
  created_at: string;
};

const CATEGORIAS = ["Relatório", "Ata", "Plano", "Contrato", "Especificação", "Apresentação", "Outros"];

function tamanhoLegivel(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useDocumentos(projetoId: string) {
  return useQuery({
    queryKey: ["documentos", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("projeto_id", projetoId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Documento[];
    },
  });
}

export function DocumentosProjeto({ projetoId }: { projetoId: string }) {
  const { can, perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: documentos = [] } = useDocumentos(projetoId);
  const { data: fases = [] } = useFases(projetoId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0] as string);
  const [faseId, setFaseId] = useState("");
  const [visivel, setVisivel] = useState(true);

  const podeEditar = can("projeto.editar");

  const visiveis = documentos.filter((d) => d.visivel_cliente).length;

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ["documentos", projetoId] });
  }

  const alternarVisibilidade = useMutation({
    mutationFn: async (doc: Documento) => {
      const { error } = await supabase
        .from("documentos")
        .update({ solicita_portal: !doc.solicita_portal })
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Pedido de liberação atualizado. O portal só exibe depois da aprovação.");
    },
    onError: () => toast.error("Não foi possível alterar a liberação."),
  });

  const remover = useMutation({
    mutationFn: async (doc: Documento) => {
      const { error } = await supabase
        .from("documentos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Documento removido.");
    },
    onError: () => toast.error("Não foi possível remover o documento."),
  });

  async function enviar(arquivo: File) {
    setEnviando(true);
    try {
      const extensao = arquivo.name.includes(".") ? arquivo.name.split(".").pop() : "dat";
      const caminho = `${projetoId}/${crypto.randomUUID()}.${extensao}`;
      const upload = await supabase.storage.from("documentos").upload(caminho, arquivo, {
        contentType: arquivo.type || "application/octet-stream",
      });
      if (upload.error) throw upload.error;

      const { data, error } = await supabase
        .from("documentos")
        .insert({
          tenant_id: perfil?.tenant_id ?? "",
          projeto_id: projetoId,
          fase_id: faseId || null,
          nome: nome.trim() || arquivo.name,
          descricao: descricao.trim() || null,
          categoria,
          arquivo_path: caminho,
          tipo: arquivo.type || null,
          tamanho: arquivo.size,
          solicita_portal: visivel,
          aprovacao_status: "pendente",
          autor_id: perfil?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;


      setNome("");
      setDescricao("");
      setFaseId("");
      invalidar();
      toast.success("Documento publicado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o documento.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function baixar(doc: Documento) {
    try {
      if (doc.url) {
        window.open(doc.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (!doc.arquivo_path) throw new Error("Documento sem arquivo");
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.arquivo_path, 120);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o documento.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Documentos" valor={documentos.length} detalhe="no projeto" />
        <Indicador titulo="Liberados ao cliente" valor={visiveis} tom="positivo" detalhe="visíveis no portal" />
        <Indicador titulo="Uso interno" valor={documentos.length - visiveis} detalhe="não aparecem no portal" />
      </div>

      {podeEditar ? (
        <Painel>
          <h2 className="font-display text-[15px] font-bold">Publicar documento</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo label="Nome (opcional)">
              <input
                className={inputClasses}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Relatório de status semanal"
              />
            </Campo>
            <Campo label="Categoria">
              <select className={inputClasses} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Fase relacionada">
              <select className={inputClasses} value={faseId} onChange={(e) => setFaseId(e.target.value)}>
                <option value="">Sem fase específica</option>
                {fases.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Descrição">
              <input
                className={inputClasses}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Resumo do conteúdo"
              />
            </Campo>
          </div>

          <label className="mt-3 flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} />
            Pedir liberação no portal do cliente (aparece só depois de aprovado)
          </label>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void enviar(arquivo);
            }}
          />
          <BotaoPrimario className="mt-4" disabled={enviando} onClick={() => inputRef.current?.click()}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Escolher arquivo e publicar
          </BotaoPrimario>
        </Painel>
      ) : null}

      <Painel>
        <h2 className="font-display text-[15px] font-bold">Biblioteca do projeto</h2>
        <div className="mt-3 divide-y divide-border/70">
          {documentos.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{d.nome}</span>
                    <Pill className={d.visivel_cliente ? "bg-success/12 text-success" : "bg-secondary text-muted-foreground"}>
                      {d.visivel_cliente ? "No portal" : "Interno"}
                    </Pill>
                    {d.solicita_portal && d.aprovacao_status !== "aprovado" ? (
                      <Pill
                        className={
                          d.aprovacao_status === "rejeitado" ? "bg-danger/12 text-danger" : "bg-warning/15 text-warning"
                        }
                      >
                        {d.aprovacao_status === "rejeitado" ? "Recusado" : "Aguardando aprovação"}
                      </Pill>
                    ) : null}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {d.categoria} · {fmtData(d.created_at, "dd MMM yyyy")} · {tamanhoLegivel(d.tamanho)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => baixar(d)}
                  title="Abrir"
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-brand"
                >
                  <Download className="size-4" />
                </button>
                {podeEditar ? (
                  <>
                    <button
                      onClick={() => alternarVisibilidade.mutate(d)}
                      title={d.visivel_cliente ? "Ocultar do cliente" : "Liberar ao cliente"}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-brand"
                    >
                      {d.visivel_cliente ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      onClick={() => remover.mutate(d)}
                      title="Remover"
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {documentos.length === 0 ? (
            <Vazio titulo="Nenhum documento" descricao="Publique relatórios, atas e planos para o cliente." />
          ) : null}
        </div>
      </Painel>
    </div>
  );
}
