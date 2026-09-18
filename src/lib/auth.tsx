import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  cargo: string | null;
  custo_hora: number | null;
  capacidade_semanal: number | null;
};

export type Tenant = { id: string; nome: string; plano: string; assentos: number };

type AuthState = {
  session: Session | null;
  perfil: Perfil | null;
  tenant: Tenant | null;
  permissoes: string[];
  papeis: string[];
  carregando: boolean;
  can: (permissao: string) => boolean;
  sair: () => Promise<void>;
  recarregar: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [papeis, setPapeis] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarContexto = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setPerfil(null);
      setTenant(null);
      setPermissoes([]);
      setPapeis([]);
      setCarregando(false);
      return;
    }

    // Garante que a conta autenticada tenha um perfil dentro de uma empresa.
    const nomeMeta = userData.user.user_metadata?.['nome'] as string | undefined;
    await supabase.rpc("bootstrap_perfil", nomeMeta ? { _nome: nomeMeta } : {});

    const { data: perfilData } = await supabase
      .from("profiles")
      .select("id, tenant_id, nome, email, cargo, custo_hora, capacidade_semanal")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!perfilData) {
      setCarregando(false);
      return;
    }
    setPerfil(perfilData as Perfil);

    const [{ data: tenantData }, { data: vinculos }] = await Promise.all([
      supabase.from("tenants").select("id, nome, plano, assentos").eq("id", perfilData.tenant_id).maybeSingle(),
      supabase.from("usuario_roles").select("role_id, roles(slug, nome)").eq("profile_id", perfilData.id),
    ]);

    setTenant((tenantData as Tenant) ?? null);

    const roleIds = (vinculos ?? []).map((v) => v.role_id);
    setPapeis(
      (vinculos ?? [])
        .map((v) => (v.roles as { nome?: string } | null)?.nome ?? "")
        .filter(Boolean),
    );

    if (roleIds.length) {
      const { data: perms } = await supabase.from("role_permissoes").select("permissao").in("role_id", roleIds);
      setPermissoes(Array.from(new Set((perms ?? []).map((p) => p.permissao))));
    } else {
      setPermissoes([]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, novaSessao) => {
      setSession(novaSessao);
      if (event === "SIGNED_OUT") {
        setPerfil(null);
        setTenant(null);
        setPermissoes([]);
        setPapeis([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void carregarContexto();
    });

    return () => sub.subscription.unsubscribe();
  }, [carregarContexto]);

  const can = useCallback((permissao: string) => permissoes.includes(permissao), [permissoes]);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, perfil, tenant, permissoes, papeis, carregando, can, sair, recarregar: carregarContexto }),
    [session, perfil, tenant, permissoes, papeis, carregando, can, sair, carregarContexto],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
