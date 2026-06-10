// Source de contenu UNIQUE pour les pages marketing SEO.
// Consommée à la fois par le rendu React (ContentPage.tsx) et par le
// générateur de pré-rendu (scripts/prerender-content.ts). Pas de duplication.

export interface ContentSection {
  h2: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface MarketingPage {
  slug: string; // ex: "services/migration-cloud" (sans slash initial)
  title: string; // <title> SEO (< 60 caractères idéalement)
  description: string; // meta description (50-160)
  h1: string;
  intro: string;
  sections: ContentSection[];
  /** Slugs d'autres pages à mettre en lien (maillage interne). */
  related?: string[];
}

const ZONE =
  "en Guinée et en Afrique de l'Ouest francophone (Sénégal, Côte d'Ivoire, Mali, Burkina Faso, Togo, Bénin, Niger)";

export const MARKETING_PAGES: MarketingPage[] = [
  {
    slug: "services",
    title: "Services Cloud, DevOps & IA | CloudMature",
    description:
      "Conseil Cloud (Azure, AWS, GCP), DevOps, IA, sécurité et FinOps pour les entreprises de Guinée et d'Afrique de l'Ouest. Découvrez nos services.",
    h1: "Nos services Cloud, DevOps et Intelligence Artificielle",
    intro:
      `CloudMature accompagne les organisations ${ZONE} dans leur transformation numérique : ` +
      "migration vers le Cloud, automatisation DevOps, intelligence artificielle, sécurité et maîtrise des coûts. " +
      "Une approche pragmatique, adaptée aux réalités d'infrastructure et de connectivité locales.",
    sections: [
      {
        h2: "Un partenaire technologique de proximité",
        paragraphs: [
          "Basés à Conakry, nous intervenons auprès des PME, grandes entreprises, institutions et organisations de la sous-région. " +
            "Notre équipe combine l'expertise des grands fournisseurs Cloud (Microsoft Azure, Amazon Web Services, Google Cloud) " +
            "avec une connaissance fine du contexte ouest-africain.",
        ],
      },
      {
        h2: "Nos domaines d'expertise",
        paragraphs: ["Quatre grands domaines, complémentaires, pour couvrir l'ensemble de votre parcours Cloud :"],
        bullets: [
          "Conseil et migration Cloud — évaluation, architecture et migration vers Azure, AWS ou GCP.",
          "DevOps et automatisation — CI/CD, conteneurs, Kubernetes, Infrastructure as Code.",
          "Intelligence artificielle — IA générative, automatisation intelligente, valorisation des données.",
          "Sécurité et conformité — ISO 27001, SOC 2, RGPD, FinOps et gouvernance.",
        ],
      },
    ],
    related: ["services/migration-cloud", "services/devops", "services/intelligence-artificielle", "services/securite-conformite"],
  },
  {
    slug: "services/migration-cloud",
    title: "Migration Cloud Azure, AWS, GCP | CloudMature",
    description:
      "Migration vers le Cloud (Azure, AWS, Google Cloud) pour entreprises de Guinée et d'Afrique de l'Ouest : évaluation, architecture, exécution sécurisée.",
    h1: "Migration et conseil Cloud — Azure, AWS, Google Cloud",
    intro:
      `Nous aidons les entreprises ${ZONE} à migrer vers le Cloud de façon maîtrisée : ` +
      "réduction des coûts, scalabilité, sécurité et continuité d'activité, sans rupture pour vos équipes.",
    sections: [
      {
        h2: "Une migration en quatre étapes",
        paragraphs: ["Notre méthode limite les risques et rend chaque étape mesurable :"],
        bullets: [
          "Évaluation — audit de l'existant, cartographie des applications et estimation des coûts.",
          "Architecture — conception de l'environnement cible (Azure, AWS ou GCP) selon vos besoins.",
          "Migration — exécution par vagues, avec tests et bascule contrôlée.",
          "Optimisation — FinOps, sécurité et amélioration continue après la migration.",
        ],
      },
      {
        h2: "Pourquoi migrer vers le Cloud en Afrique de l'Ouest",
        paragraphs: [
          "Le Cloud permet aux organisations de la sous-région de s'affranchir des contraintes matérielles, " +
            "de payer à l'usage et d'accéder à des services de niveau international. " +
            "Nous tenons compte des contraintes locales de connectivité et de souveraineté des données pour concevoir des architectures résilientes.",
        ],
      },
    ],
    related: ["services/devops", "services/securite-conformite", "services"],
  },
  {
    slug: "services/devops",
    title: "DevOps, CI/CD & Kubernetes | CloudMature",
    description:
      "Services DevOps pour entreprises de Guinée et d'Afrique de l'Ouest : CI/CD, conteneurs, Kubernetes, Infrastructure as Code et automatisation.",
    h1: "DevOps et automatisation — CI/CD, Kubernetes, IaC",
    intro:
      `Nous mettons en place des pratiques DevOps qui accélèrent vos livraisons et fiabilisent vos déploiements, ` +
      `pour les équipes techniques ${ZONE}.`,
    sections: [
      {
        h2: "Ce que nous automatisons",
        paragraphs: ["Du code à la production, sans intervention manuelle à risque :"],
        bullets: [
          "Pipelines CI/CD — intégration et déploiement continus, tests automatisés.",
          "Conteneurs et Kubernetes — orchestration, scalabilité et haute disponibilité.",
          "Infrastructure as Code — Terraform, Bicep : une infrastructure versionnée et reproductible.",
          "Observabilité — supervision, journaux et alertes pour anticiper les incidents.",
        ],
      },
      {
        h2: "Des bénéfices mesurables",
        paragraphs: [
          "Des déploiements plus fréquents et plus sûrs, un temps de rétablissement réduit en cas d'incident, " +
            "et des équipes qui se concentrent sur la valeur plutôt que sur les tâches répétitives.",
        ],
      },
    ],
    related: ["services/migration-cloud", "services/securite-conformite", "services"],
  },
  {
    slug: "services/intelligence-artificielle",
    title: "Intelligence Artificielle & IA générative | CloudMature",
    description:
      "Solutions d'intelligence artificielle et d'IA générative pour entreprises de Guinée et d'Afrique de l'Ouest : automatisation, données, assistants.",
    h1: "Intelligence artificielle et IA générative",
    intro:
      `Nous aidons les organisations ${ZONE} à exploiter l'intelligence artificielle de façon concrète et responsable, ` +
      "pour automatiser des tâches, valoriser leurs données et améliorer l'expérience de leurs clients.",
    sections: [
      {
        h2: "Des cas d'usage à fort impact",
        paragraphs: ["Nous privilégions les projets IA qui apportent une valeur métier rapide :"],
        bullets: [
          "Assistants et agents conversationnels (support, FAQ, aide interne).",
          "Automatisation intelligente de processus documentaires.",
          "Analyse et valorisation des données d'entreprise.",
          "IA générative appliquée à la productivité des équipes.",
        ],
      },
      {
        h2: "Une IA maîtrisée et conforme",
        paragraphs: [
          "Nous intégrons dès la conception les enjeux de sécurité, de protection des données et de gouvernance, " +
            "pour une IA fiable, traçable et alignée sur vos obligations réglementaires.",
        ],
      },
    ],
    related: ["services/devops", "services/securite-conformite", "services"],
  },
  {
    slug: "services/securite-conformite",
    title: "Sécurité Cloud & Conformité (ISO, SOC 2, RGPD) | CloudMature",
    description:
      "Sécurité Cloud et conformité pour entreprises de Guinée et d'Afrique de l'Ouest : ISO 27001, SOC 2, RGPD, FinOps et gouvernance.",
    h1: "Sécurité Cloud, conformité et FinOps",
    intro:
      `Nous sécurisons vos environnements Cloud et vous aidons à respecter les standards les plus exigeants, ` +
      `pour les organisations ${ZONE}.`,
    sections: [
      {
        h2: "Sécurité et conformité",
        paragraphs: ["Une posture de sécurité alignée sur les référentiels internationaux :"],
        bullets: [
          "Mise en conformité ISO 27001, SOC 2 et RGPD.",
          "Sécurité des identités, des accès et des données.",
          "Audit de sécurité et plan de remédiation.",
          "Gouvernance et politiques de sécurité.",
        ],
      },
      {
        h2: "FinOps — maîtriser ses coûts Cloud",
        paragraphs: [
          "Le Cloud mal gouverné coûte cher. Nous mettons en place une démarche FinOps pour suivre, " +
            "optimiser et prévoir vos dépenses Cloud, sans sacrifier la performance.",
        ],
      },
    ],
    related: ["services/migration-cloud", "services/devops", "services"],
  },
];

export const BASE_URL = "https://cloudmature.com";

export function findPage(slug: string): MarketingPage | undefined {
  return MARKETING_PAGES.find((p) => p.slug === slug);
}
