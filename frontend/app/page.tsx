import {
  Ecosystem,
  Faq,
  FinalCta,
  Footer,
  Guarantee,
  Header,
  Hero,
  LandingAuthProvider,
  Pain,
  Potential,
  Pricing,
  Reviews,
  Ticker,
  Trust,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <LandingAuthProvider>
      <Header />
      <main>
        <Hero />
        <Ticker />
        <Pain />
        <Potential />
        <Guarantee />
        <Ecosystem />
        <Reviews />
        <Pricing />
        <Faq />
        <Trust />
        <FinalCta />
      </main>
      <Footer />
    </LandingAuthProvider>
  );
}
