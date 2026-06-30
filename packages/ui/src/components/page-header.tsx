import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function PageContainer({
  children,
  size = "lg",
}: {
  children: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className={size === "md" ? "mx-auto max-w-3xl" : "mx-auto max-w-5xl"}>
      {children}
    </div>
  );
}
