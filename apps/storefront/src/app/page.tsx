"use client";

import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageContainer,
  PageHeader,
} from "@harbor/ui";

const steps = [
  {
    title: "Book",
    description: "Pay through Stripe Checkout. Funds are held by Harbor.",
  },
  {
    title: "Deliver",
    description: "The provider completes the job and marks it delivered.",
  },
  {
    title: "Approve",
    description: "You approve delivery and Harbor releases the payout.",
  },
];

/**
 * S0 stub — catalog and checkout arrive in S2, /demo in S5.
 * Client component because the @harbor/ui barrel re-exports react-hook-form.
 */
export default function HomePage() {
  return (
    <main className="px-4 py-12 sm:px-6">
      <PageContainer>
        <PageHeader
          title="Harbor"
          description="A services marketplace with hold-and-release payments on Stripe Connect."
          actions={<Badge variant="secondary">Test mode</Badge>}
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <CardTitle>
                  {index + 1}. {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PageContainer>
    </main>
  );
}
