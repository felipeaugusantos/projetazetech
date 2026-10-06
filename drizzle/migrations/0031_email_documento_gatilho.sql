-- 0031 — Corrige o gatilho de e-mail de documento publicado (0030)
-- No fluxo real, a equipe aprova o documento alterando `aprovacao_status`; quem liga
-- `visivel_cliente` é o gatilho BEFORE documentos_aplica_aprovacao. Um gatilho
-- "UPDATE OF visivel_cliente" só dispara quando a coluna aparece no SET do UPDATE, não
-- quando ela é alterada por outro gatilho, então o e-mail "Novos documentos" nunca era
-- enfileirado na aprovação. Agora o gatilho também observa as colunas que o app altera.
DROP TRIGGER IF EXISTS email_documento ON public.documentos;
CREATE TRIGGER email_documento
  AFTER INSERT OR UPDATE OF visivel_cliente, solicita_portal, aprovacao_status ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.email_gatilho_documento();
