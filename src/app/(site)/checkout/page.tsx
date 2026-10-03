import { PageHero } from "@/components/landing/page-parts";
import { CheckoutForm } from "@/components/landing/checkout-form";
import { SERVICES } from "@/lib/landing-services";
import { getTrialConfig } from "@/lib/studio/trial";

export const metadata = {
  title: "Checkout | Zinetic Music",
  description: "Choose a service and plan, create your account and place your order.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; plan?: string; payment?: string }>;
}) {
  const { service, plan, payment } = await searchParams;
  const trialRules = await getTrialConfig();
  const initialService = SERVICES.find((s) => s.id === service)?.id ?? SERVICES[0].id;

  return (
    <>
      <PageHero
        className="pb-10 sm:pb-14"
        eyebrow="Checkout"
        title={
          <>
            Pick a plan. <span className="zl-serif zl-grad-text">Start today.</span>
          </>
        }
        sub="Browse every service, choose the plan that fits and place your order in one go."
      />
      <section className="px-5 pb-24 sm:pb-32">
        <div className="mx-auto max-w-6xl">
          <CheckoutForm
            initialService={initialService}
            initialPlan={plan ?? ""}
            trial={{ enabled: trialRules.enabled, generations: trialRules.max_generations, spend: trialRules.max_spend, days: trialRules.days }}
            notice={
              payment === "failed"
                ? "The payment did not go through, so you were not charged. You can try again."
                : payment === "cancelled"
                  ? "You cancelled the payment. Nothing was charged, you can continue whenever you are ready."
                  : null
            }
          />
        </div>
      </section>
    </>
  );
}
