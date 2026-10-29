import {
  Ecosystem,
  Faq,
  Footer,
  Header,
  Hero,
  LandingAuthProvider,
  Potential,
  Pricing,
  Reviews,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <LandingAuthProvider>
      <Header />
      <main>
        <Hero />
        <Potential />
        <Ecosystem />
        <Pricing />
        <Faq />
        <Reviews />
      </main>
      <Footer />
    </LandingAuthProvider>
  );
}
