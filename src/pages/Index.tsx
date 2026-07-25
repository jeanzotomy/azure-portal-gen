import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";

import { AboutSection } from "@/components/AboutSection";
import { ServicesSection } from "@/components/ServicesSection";
import { IndustriesSection } from "@/components/IndustriesSection";
import { WhyUsSection } from "@/components/WhyUsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { useSeo } from "@/hooks/use-seo";


const Index = () => {
  useSeo({
    title: "CloudMature | Cloud · DevOps · IA - Conakry, Guinée",
    description: "Cloud Mature accompagne votre transformation Cloud (public, privé, hybride) avec une approche sécurisée, performante et conforme aux standards.",
    path: "/",
  });
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash);
        el?.scrollIntoView({ behavior: "smooth"
  });
      }, 100);
    }
  }, [location.hash]);
  return (
  <div className="min-h-screen">
    <Navbar />
    <HeroSection />
    <AboutSection />
    <ServicesSection />
    <IndustriesSection />
    <WhyUsSection />
    <ContactSection />
    <Footer />
  </div>
  );
};

export default Index;
