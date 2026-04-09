import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { IndustriesSection } from "@/components/IndustriesSection";
import { WhyUsSection } from "@/components/WhyUsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <HeroSection />
    <ServicesSection />
    <IndustriesSection />
    <WhyUsSection />
    <ContactSection />
    <Footer />
  </div>
);

export default Index;
