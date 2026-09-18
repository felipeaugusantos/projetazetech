import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Palette, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BotaoPrimario, BotaoSecundario, Campo, Painel, inputClasses } from "@/components/kit";

type Tema = {
  id: string;
  nome_exibicao: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_destaque: string | null;
  mensagem: string | null;
};

const COR_PADRAO = "#008037";
const DESTAQUE_PADRAO = "#00D15C";

export function PortalTema({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const { can, perfil } = useAuth();
  const queryClient = useQueryClient();
  const podeEditar = can("cliente.editar");

  const { data: tema } = useQuery({
    queryKey: ["portal-tema", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_temas")
        .select("id, nome_exibicao, logo_url, cor_primaria, cor_destaque, mensagem")
        .eq("cliente_id", clienteId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Tema | null;
    },
  });

  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(COR_PADRAO);
  const [destaque, setDestaque] = useState(DESTAQUE_PADRAO);
  const [mensagem, setMensagem] = useState("");
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    setNome(tema?.nome_exibicao ?? clienteNome);
    setCor(tema?.cor_primaria ?? COR_PADRAO);
    setDestaque(tema?.cor_destaque ?? DESTAQUE_PADRAO);
    setMensagem(tema?.mensagem ?? "");
    setLogo(tema?.logo_url ?? null);
  }, [tema, clienteNome]);

  const salvar = useMutation({
    mutationFn: async () => {
      const valores = {
        tenant_id: perfil?.tenant_id ?? "",
        cliente_id: clienteId,
        nome_exibicao: nome.trim() || null,
        cor_primaria: cor,
        cor_destaque: destaque,
        mensagem: mensagem.trim() || null,
        logo_url: logo,
      };
      const { error } = tema
        ? await supabase.from("portal_temas").update(valores).eq("id", tema.id)
        : await supabase.from("portal_temas").insert(valores);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal-tema", clienteId] });
      toast.success("Personalização do portal salva.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível salvar."),
  });

  function carregarLogo(arquivo: File) {
    if (arquivo.size > 300 * 1024) {
      toast.error("Use uma imagem de até 300 KB.");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => setLogo(String(leitor.result));
    leitor.readAsDataURL(arquivo);
  }

  return (
    <Painel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold">
            <Palette className="size-4 text-brand" /> Personalização do portal
          </h2>
          <p className="text-[11.5px] text-muted-foreground">
            Logotipo, nome e cores que este cliente vê no portal. Cada cliente vê apenas os seus dados.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Campo label="Nome exibido no portal" className="sm:col-span-2">
          <input
            className={inputClasses}
            value={nome}
            disabled={!podeEditar}
            onChange={(e) => setNome(e.target.value)}
            placeholder={clienteNome}
          />
        </Campo>

        <Campo label="Cor da identidade">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cor}
              disabled={!podeEditar}
              onChange={(e) => setCor(e.target.value)}
              className="size-10 shrink-0 cursor-pointer rounded-lg border border-border bg-card"
            />
            <input className={inputClasses} value={cor} disabled={!podeEditar} onChange={(e) => setCor(e.target.value)} />
          </div>
        </Campo>

        <Campo label="Cor dos botões de ação">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={destaque}
              disabled={!podeEditar}
              onChange={(e) => setDestaque(e.target.value)}
              className="size-10 shrink-0 cursor-pointer rounded-lg border border-border bg-card"
            />
            <input
              className={inputClasses}
              value={destaque}
              disabled={!podeEditar}
              onChange={(e) => setDestaque(e.target.value)}
            />
          </div>
        </Campo>

        <Campo label="Mensagem de boas-vindas" className="sm:col-span-2">
          <input
            className={inputClasses}
            value={mensagem}
            disabled={!podeEditar}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Acompanhe aqui o andamento dos seus projetos."
          />
        </Campo>

        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Logotipo</span>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="grid h-14 w-32 place-items-center overflow-hidden rounded-xl border border-border bg-card"
              style={{ background: logo ? undefined : `color-mix(in oklab, ${cor} 10%, white)` }}
            >
              {logo ? (
                <img src={logo} alt="Logotipo do cliente" className="max-h-12 max-w-[120px] object-contain" />
              ) : (
                <span className="text-[11px] text-muted-foreground">sem logotipo</span>
              )}
            </div>
            {podeEditar ? (
              <>
                <label className="frost-soft inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition hover:bg-card">
                  <ImagePlus className="size-4" /> Enviar imagem
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) carregarLogo(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {logo ? (
                  <BotaoSecundario onClick={() => setLogo(null)} className="px-3 py-2">
                    <Trash2 className="size-4" /> Remover
                  </BotaoSecundario>
                ) : null}
              </>
            ) : null}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">PNG, JPG, SVG ou WEBP de até 300 KB.</p>
        </div>
      </div>

      {podeEditar ? (
        <div className="mt-4 flex justify-end">
          <BotaoPrimario disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar personalização
          </BotaoPrimario>
        </div>
      ) : null}
    </Painel>
  );
}
