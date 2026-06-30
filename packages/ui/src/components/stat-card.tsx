import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { cn } from "../lib/utils";

export function StatCard({
  label,
  value,
  valueClassName,
  href,
  linkLabel,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn("text-3xl font-semibold tabular-nums", valueClassName)}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {href && linkLabel ? (
        <CardContent className="pt-0">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:text-primary/80"
          >
            {linkLabel} →
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}
