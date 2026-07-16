import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { DesignStory } from '@/components/landing/design-story'
import { FeaturePlayground } from '@/components/landing/feature-playground'
import { CtaSection, Footer } from '@/components/landing/cta-footer'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <DesignStory />
      <FeaturePlayground />
      <CtaSection />
      <Footer />
    </main>
  )
}
