import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { iniciais } from "@/lib/enzova";

export function Painel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={cn("frost rounded-2xl", padded && "p-5", className)}>{children}</div>;
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
}

export function Progresso({ valor, className }: { valor: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-secondary", className)}>
      <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Avatar({
  nome,
  className,
  tone = "brand",
}: {
  nome?: string | null;
  className?: string;
  tone?: "brand" | "muted";
}) {
  return (
    <span
      title={nome ?? undefined}
      className={cn(
        "grid shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold",
        tone === "brand" ? "bg-brand-soft text-brand-ink" : "bg-secondary text-muted-foreground",
        "size-7",
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

export function Indicador({
  titulo,
  valor,
  detalhe,
  tom = "neutro",
  progresso,
}: {
  titulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "neutro" | "positivo" | "atencao" | "negativo";
  progresso?: number;
}) {
  const cores = {
    neutro: "text-foreground",
    positivo: "text-success",
    atencao: "text-warning",
    negativo: "text-danger",
  } as const;
  return (
    <Painel className="p-4">
      <div className="text-[12px] font-medium text-muted-foreground">{titulo}</div>
      <div className={cn("mt-1 font-display text-[28px] leading-none font-bold", cores[tom])}>{valor}</div>
      {detalhe ? <div className="mt-1.5 text-[11px] text-muted-foreground">{detalhe}</div> : null}
      {typeof progresso === "number" ? <Progresso valor={progresso} className="mt-3 h-1.5" /> : null}
    </Painel>
  );
}

export function BotaoPrimario({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-foreground frost-soft transition hover:bg-card disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Campo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClasses =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Vazio({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="py-10 text-center">
      <div className="font-display text-[15px] font-semibold">{titulo}</div>
      {descricao ? <div className="mt-1 text-[12px] text-muted-foreground">{descricao}</div> : null}
    </div>
  );
}

export function TituloPagina({
  sobretitulo,
  titulo,
  descricao,
  acoes,
}: {
  sobretitulo?: ReactNode;
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {sobretitulo ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">{sobretitulo}</div>
        ) : null}
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight">{titulo}</h1>
        {descricao ? <div className="text-[13px] text-muted-foreground">{descricao}</div> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </div>
  );
}
