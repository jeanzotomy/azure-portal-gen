## Objectif

Dans la section "Nos services" :
1. Fusionner les cartes **Architecture & Ingénierie Cloud** et **Migration & Modernisation** en une seule carte unifiée.
2. Remplacer le slot libéré par une nouvelle carte **Développement d'applications métier modernes**.
3. Réécrire les textes (titres + descriptions) pour qu'ils soient plus percutants et cohérents, en FR et EN.

## Changements proposés (FR / EN)

**Carte 1 (fusionnée) — Architecture, Ingénierie & Migration Cloud**
- FR : « Conception multi-cloud (Azure, AWS, GCP) en Infrastructure-as-Code (Terraform, Bicep), Kubernetes et microservices. Migration Lift & Shift ou refactoring (Azure Migrate, AWS Migration Hub) et modernisation des workloads avec zéro interruption. »
- EN : « Multi-cloud design (Azure, AWS, GCP) with Infrastructure-as-Code (Terraform, Bicep), Kubernetes and microservices. Lift & Shift or refactoring migrations (Azure Migrate, AWS Migration Hub) and zero-downtime workload modernization. »

**Carte 2 (nouvelle) — Développement d'apps métier modernes**
- FR : « Conception et développement d'applications métier sur mesure : web, mobile et SaaS. Architectures cloud-native, API-first, intégration avec vos systèmes (ERP, CRM, SharePoint) et IA générative embarquée. »
- EN : « Design and development of tailored business applications: web, mobile and SaaS. Cloud-native, API-first architectures with integrations to your systems (ERP, CRM, SharePoint) and embedded generative AI. »

## Détails techniques

- `src/i18n/fr.ts` et `src/i18n/en.ts` — lignes 54-55 : remplacer les 2 entrées par les 2 nouvelles ci-dessus (le tableau garde 8 items, layout intact).
- `src/components/ServicesSection.tsx` — mettre à jour le tableau `icons` : remplacer `KeyRound` (index 1) par `Code2` (lucide-react) pour mieux représenter le développement d'apps. Le 1er icône (`Monitor`) reste pour la carte fusionnée — ou le remplacer par `Cloud` pour mieux refléter "Architecture & Migration Cloud".

Aucun autre fichier impacté ; layout responsive (3 + 1+image+1 + 3) conservé.
