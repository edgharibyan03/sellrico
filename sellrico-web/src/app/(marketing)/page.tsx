import { DemoSection } from "@/components/marketing/demo"
import { FeaturesSection } from "@/components/marketing/features"
import { FinalCtaSection } from "@/components/marketing/final-cta"
import { HeroSection } from "@/components/marketing/hero"
import { HowItWorksSection } from "@/components/marketing/how-it-works"
import { PricingPreviewSection } from "@/components/marketing/pricing-preview"

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <DemoSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingPreviewSection />
      <FinalCtaSection />
    </>
  )
}
