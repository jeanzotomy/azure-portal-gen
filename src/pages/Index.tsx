import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { HeroScreenCarousel } from "@/components/HeroScreenCarousel";
import { ServicesSection } from "@/components/ServicesSection";
import { IndustriesSection } from "@/components/IndustriesSection";
import { WhyUsSection } from "@/components/WhyUsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="relative">
      <HeroSection />
      <div className="relative z-20 -mt-20 pb-16">
        <HeroScreenCarousel />
      </div>
    </div>
    <ServicesSection />
    <IndustriesSection />
    <WhyUsSection />
    <ContactSection />
    <Footer />
    <ScrollToTop />
  </div>
);

export default Index;
