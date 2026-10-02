-- 0023 — Senha do link compartilhável com bcrypt (salt por senha)
-- Antes: SHA-256 sem salt e com prefixo fixo ("projeta-relatorio:"), idêntico para
-- senhas iguais e barato de quebrar offline se a tabela vazasse.
-- Agora: bcrypt (custo 10, salt aleatório). Links antigos continuam funcionando e são
-- migrados para bcrypt no primeiro acesso bem-sucedido.

-- 1. Gera o hash (chamada pelo app ao criar o link). Passa a ser VOLATILE: cada chamada
--    usa um salt novo.
CREATE OR REPLACE FUNCTION public.relatorio_link_hash(p_senha text)
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_senha IS NULL OR btrim(p_senha) = '' THEN NULL
    ELSE extensions.crypt(btrim(p_senha), extensions.gen_salt('bf', 10))
  END
$$;

REVOKE ALL ON FUNCTION public.relatorio_link_hash(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_link_hash(text) TO authenticated;

-- 2. Confere a senha: bcrypt ($2…) ou, para links antigos, o SHA-256 legado.
CREATE OR REPLACE FUNCTION public.relatorio_link_senha_confere(p_senha text, p_hash text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  IF p_senha IS NULL OR p_hash IS NULL THEN RETURN false; END IF;
  IF p_hash LIKE '$2%' THEN
    RETURN extensions.crypt(btrim(p_senha), p_hash) = p_hash;
  END IF;
  RETURN encode(extensions.digest('projeta-relatorio:' || btrim(p_senha), 'sha256'), 'hex') = p_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_link_senha_confere(text, text) FROM PUBLIC, anon, authenticated;

-- 3. relatorio_link_abrir_base passa a usar a conferência acima e converte hashes
--    legados para bcrypt no primeiro acesso válido. O corpo existente é reescrito a
--    partir da definição atual (evita copiar a função inteira e perder mudanças).
DO $do$
DECLARE
  v_def text;
  v_novo text;
BEGIN
  v_def := pg_get_functiondef('public.relatorio_link_abrir_base(text, text, text)'::regprocedure);
  v_novo := v_def;

  v_novo := replace(
    v_novo,
    'public.relatorio_link_hash(p_senha) IS DISTINCT FROM v_link.senha_hash',
    'NOT public.relatorio_link_senha_confere(p_senha, v_link.senha_hash)'
  );
  IF position('relatorio_link_senha_confere' IN v_novo) = 0 THEN
    RAISE EXCEPTION 'relatorio_link_abrir_base mudou: comparação de senha não encontrada';
  END IF;

  v_novo := replace(
    v_novo,
    'SET acessos = acessos + 1, ultimo_acesso = now()',
    'SET acessos = acessos + 1, ultimo_acesso = now(),
         senha_hash = CASE
           WHEN p_senha IS NOT NULL AND senha_hash IS NOT NULL AND senha_hash NOT LIKE ''$2%''
           THEN public.relatorio_link_hash(p_senha)
           ELSE senha_hash
         END'
  );
  IF position('NOT LIKE' IN v_novo) = 0 THEN
    RAISE EXCEPTION 'relatorio_link_abrir_base mudou: atualização de acessos não encontrada';
  END IF;

  EXECUTE v_novo;
END
$do$;

REVOKE ALL ON FUNCTION public.relatorio_link_abrir_base(text, text, text) FROM PUBLIC, anon, authenticated;
