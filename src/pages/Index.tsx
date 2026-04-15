import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { HeroScreenCarousel } from "@/components/HeroScreenCarousel";
import { AboutSection } from "@/components/AboutSection";
import { ServicesSection } from "@/components/ServicesSection";
import { IndustriesSection } from "@/components/IndustriesSection";
import { WhyUsSection } from "@/components/WhyUsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash);
        el?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location.hash]);
  return (
  <div className="min-h-screen">
    <Navbar />
    <div className="relative">
      <HeroSection />
      <div className="relative z-20 -mt-24 pb-16">
        <HeroScreenCarousel />
      </div>
    </div>
    <AboutSection />
    <ServicesSection />
    <IndustriesSection />
    <WhyUsSection />
    <ContactSection />
    <Footer />
    <ScrollToTop />
  </div>
  );
};

export default Index;
