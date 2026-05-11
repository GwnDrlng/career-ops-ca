# Contexte partagé -- career-ops (Français québécois)

<!-- ============================================================
     PERSONNALISATION DE CE FICHIER
     ============================================================
     Ce fichier contient le contexte partagé pour tous les modes
     career-ops en version française québécoise. Avant d'utiliser career-ops, tu DOIS :
     1. Remplir config/profile.yml avec tes informations personnelles
     2. Créer cv.md à la racine du projet (CV en Markdown)
     3. (Optionnel) Créer article-digest.md avec tes proof points
     4. Adapter les sections marquées [PERSONNALISER] ci-dessous
     ============================================================ -->

## Sources de vérité (TOUJOURS lire avant chaque évaluation)

| Fichier | Chemin | Quand |
|---------|--------|-------|
| cv.md | `cv.md` (racine du projet) | TOUJOURS |
| article-digest.md | `article-digest.md` (si existant) | TOUJOURS (proof points détaillés) |
| profile.yml | `config/profile.yml` | TOUJOURS (identité et rôles cibles) |

**RÈGLE : Ne JAMAIS coder en dur des métriques issues des proof points.** Les lire depuis `cv.md` et `article-digest.md` au moment de l'évaluation.
**RÈGLE : Pour les métriques d'articles/projets, `article-digest.md` a priorité sur `cv.md`** (`cv.md` peut contenir des chiffres plus anciens).

---

## North Star -- Rôles cibles

Le skill traite TOUS les rôles cibles avec le même soin. Aucun n'est primaire ou secondaire -- chacun est un succès si la rémunération et les perspectives d'évolution sont au rendez-vous :

| Archétype | Axes thématiques | Ce que l'entreprise achète |
|-----------|------------------|----------------------------|
| **AI Platform / LLMOps Engineer** | Évaluation, Observabilité, Fiabilité, Pipelines | Quelqu'un qui met l'IA en production avec des métriques |
| **Agentic Workflows / Automation** | HITL, Tooling, Orchestration, Multi-Agent | Quelqu'un qui construit des systèmes agents fiables |
| **Technical AI Product Manager** | GenAI/Agents, PRDs, Discovery, Delivery | Quelqu'un qui traduit le business en produits IA |
| **AI Solutions Architect** | Hyperautomation, Enterprise, Intégrations | Quelqu'un qui conçoit des architectures IA end-to-end |
| **AI Forward Deployed Engineer** | Client-facing, Livraison rapide, Prototypage | Quelqu'un qui déploie des solutions IA rapidement chez le client |
| **AI Transformation Lead** | Conduite du changement, Adoption, Enablement | Quelqu'un qui pilote la transformation IA dans les organisations |

<!-- [PERSONNALISER] Adapte les archétypes ci-dessus à tes rôles cibles.
     Exemple pour le backend engineering :
     - Senior Backend Engineer
     - Staff Platform Engineer
     - Engineering Manager
     etc. -->

### Framing adaptatif par archétype

> **Métriques concrètes : les lire depuis `cv.md` et `article-digest.md` au moment de l'évaluation. JAMAIS les coder en dur ici.**

| Si le rôle est... | Mettre en avant chez le candidat... | Sources de proof points |
|-------------------|-------------------------------------|-------------------------|
| Platform / LLMOps | Expérience production, observabilité, évals, closed-loop | article-digest.md + cv.md |
| Agentic / Automation | Orchestration multi-agent, HITL, fiabilité, coûts | article-digest.md + cv.md |
| Technical AI PM | Product discovery, PRDs, métriques, gestion des parties prenantes | cv.md + article-digest.md |
| Solutions Architect | Conception système, intégrations, prêt pour l'entreprise | article-digest.md + cv.md |
| Forward Deployed Engineer | Livraison rapide, proximité client, prototype à production | cv.md + article-digest.md |
| AI Transformation Lead | Conduite du changement, enablement d'équipe, adoption | cv.md + article-digest.md |

<!-- [PERSONNALISER] Associe tes projets/articles concrets aux archétypes ci-dessus -->

### Narratif de transition (à utiliser dans TOUS les framings)

<!-- [PERSONNALISER] Remplace par ton propre narratif. Exemples :
     - "SaaS construite et vendue après 5 ans. Désormais 100% focus sur l'IA appliquée en entreprise."
     - "Lead engineering dans une Series-B pendant une croissance x10. En quête du prochain défi."
     - "Transition du conseil vers le produit. Recherche de rôles à forte responsabilité."
     Lu depuis config/profile.yml -> narrative.exit_story -->

Utiliser le narratif de transition depuis `config/profile.yml` pour cadrer TOUS les contenus :
- **Dans les summaries PDF :** Faire le pont entre le passé et le futur -- "Applique désormais les mêmes [compétences] au domaine [de l'offre]."
- **Dans les stories STAR :** Faire référence aux proof points de `article-digest.md`.
- **Dans les réponses draft (Bloc G) :** Le narratif de transition va dans la première réponse.
- **Quand l'offre mentionne "entrepreneurial", "autonomie", "builder", "end-to-end" :** C'est LE différenciateur n°1. Augmenter le poids du match.

### Avantage transversal

Cadrer le profil comme **"Builder technique avec une pratique démontrable"**, en adaptant le framing au rôle :
- Pour PM : "Builder qui réduit l'incertitude avec des prototypes puis livre en production de manière disciplinée"
- Pour FDE : "Builder qui livre dès le jour 1 avec observabilité et métriques"
- Pour SA : "Builder qui conçoit des systèmes end-to-end avec une vraie expérience d'intégration"
- Pour LLMOps : "Builder qui met l'IA en production avec des systèmes qualité en boucle fermée"

Positionner "Builder" comme signal professionnel -- pas comme "bricoleur". Les proof points réels rendent ça crédible.

### Portfolio comme proof point (utiliser dans les candidatures à fort enjeu)

<!-- [PERSONNALISER] Si tu as une démo live, un dashboard ou un projet public, configure-le ici.
     Exemple :
     dashboard:
       url: "https://tondomaine.dev/demo"
       password: "demo-2026"
       when_to_share: "Rôles LLMOps, AI Platform, Observabilité"
     Lu depuis config/profile.yml -> narrative.proof_points et narrative.dashboard -->

Si le candidat a une démo live / un dashboard (vérifier `profile.yml`), proposer l'accès dans les candidatures pertinentes.

### Intelligence rémunération (Comp Intelligence)

<!-- [PERSONNALISER] Recherche les fourchettes de rémunération pour tes rôles cibles et adapte les valeurs -->

**Conseils généraux :**
- WebSearch pour les données marché actuelles (Glassdoor.ca, Levels.fyi, LinkedIn Salaires, PayScale Canada, Indeed.ca)
- Cadrer par titre de poste, pas par compétences -- les titres définissent les bandes salariales
- Les taux travail autonome au Québec sont généralement 35-55% au-dessus du brut horaire équivalent emploi permanent (charges sociales, congés, maladie, prospection)
- Le géo-arbitrage fonctionne en télétravail : coût de la vie plus bas = meilleur net
- **Important :** Les salaires au Québec/Canada français sont typiquement 15-25% plus bas qu'au Canada anglais ou aux États-Unis pour des rôles comparables. C'est normal et attendu.

### Marché québécois -- Spécificités (IMPORTANT)

Dans les offres et négociations québécoises, certains termes et protections n'existent pas sur les marchés EN/ES/FR. Ils DOIVENT être correctement pris en compte :

| Terme | Signification | Impact sur l'évaluation |
|-------|---------------|-------------------------|
| **Emploi permanent** | Équivalent du "permanent employment" anglais ou CDI français. Le standard attendu au Québec | Standard attendu. Un contrat à durée déterminée pour un senior est un signal d'alerte |
| **CDD / Contrat à durée déterminée** | Contrat temporaire, durée fixe (contrat de projet, remplacement, saisonnier) | Acceptable pour des missions spécifiques ou projets. Sinon, questionner pourquoi pas emploi permanent |
| **Période probatoire** | Généralement 90 jours (3 mois). Employeur + employé peuvent résilier sans cause | Standard marché. Flaguer si > 6 mois. Les longues périodes sont rares au Québec |
| **Préavis** | Minimum 2 semaines de préavis (Loi sur les normes du travail). Contrat peut stipuler plus | Planifier la date de démarrage en conséquence. Moins strict qu'en France |
| **Télétravail** | Très courant au Québec depuis la pandémie. Souvent hybride 2-3 jours/semaine | Vérifier les attentes dans l'offre. Télétravail complet = avantage. Sur-site obligatoire = moins attrayant |
| **Congés payés** | Minimum légal : 2 semaines (10 jours) après 1 an d'ancienneté. Seniors souvent 3-4 semaines | À vérifier explicitement. < 2 semaines = mauvais. ≥ 3 semaines = bon |
| **Jours fériés** | 9 jours fériés légaux (Jour de l'an, Famille, Victoria Day, Canada Day, Labeur, Thanksgiving, Noël, Noël 2, Jour civique du Québec) | Vérifier si les congés supplémentaires (flex jours) sont offerts en plus |
| **Assurance-emploi** | Assurance-emploi fédéral (Canada). Cotisation obligatoire. Couvre chômage temporaire | Couvert automatiquement. Non négociable. Employeur cotise ~1.6% du salaire |
| **Régime de retraite** | Deux types : REER (Régime enregistré d'épargne-retraite) personnel ou collectif avec matching employeur. Ou plan de pension d'entreprise (moins courant au QC) | Vérifier le matching employeur si offert. REER matching = bonus non négligeable (souvent 3-5% du salaire) |
| **Assurance-maladie / Avantages sociaux** | Couverte par le régime public (ramq) + assurance-maladie privée offerte par l'employeur (prescription, dentaire, vision, psychologie) | Standard pour les entreprises. Vérifier la couverture (famille ? optique ? dentaire ?) |
| **Assurance-invalidité / Assurance-vie** | Assurance-invalidité de courte/longue durée. Assurance-vie (souvent 1-2x le salaire) | Plus rare comme argument de vente, mais important à vérifier pour les rôles seniors |
| **Stock options / Options d'achat d'actions** | Moins courant au Québec que dans la tech anglophone. Startup US = courant. Entreprise QC = rare | Si offert, demander les détails : prix d'exercice, vesting schedule (4 ans standard), cliff |
| **Prime de signature / Prime de démarrage** | Moins courant au Québec (plus EN/US). Startups bien financées peuvent l'offrir | Si offert, inclure dans le calcul du package total. Demander si elle est sujette à malus de récupération |
| **Loi sur les normes du travail** | Loi québécoise qui définit les minima légaux (congés, heures, préavis, etc.). Remplace "Code du travail" français | Les offres doivent respecter ces minima. Tout ce qui est en dessous est illégal |
| **Syndicat / Union** | Secteurs syndiqués : éduc, santé, secteur public, construction, transport. Tech : rare. Si présent = avantages additionnels | Si l'offre est syndiquée, demander la convention collective. Avantages supplémentaires possibles (congés, protections) |

### Scripts de négociation

<!-- [PERSONNALISER] Adapte à ta situation -->

**Prétentions salariales (framework général) :**
> "Sur la base des données marché actuelles pour ce type de poste, je vise une fourchette de [FOURCHETTE depuis profile.yml]. Je reste flexible sur la structure -- c'est le package global et les perspectives d'évolution qui comptent."

**Réponse à un écart de rémunération géographique :**
> "Les rôles sur lesquels je suis en concurrence sont axés sur les résultats, pas sur la localisation. Mon track record ne change pas avec le code postal."

**Si l'offre est en dessous de la cible :**
> "Je suis actuellement en discussion sur des packages dans la fourchette [fourchette supérieure]. [Entreprise] m'attire pour [raison]. Est-il possible d'atteindre [cible] ?"

**Négociation sur les avantages sociaux :**
> "Pour comparer les packages de manière équitable, pourriez-vous détailler le salaire brut annuel, le régime de retraite (matching %), et la couverture d'assurance-maladie séparément ?"

### Politique de localisation (Location Policy)

<!-- [PERSONNALISER] Adapte à ta situation. Lu depuis config/profile.yml -> location -->

**Dans les formulaires :**
- Questions binaires "Pouvez-vous être sur site ?" : répondre selon la disponibilité réelle dans `profile.yml`
- Champs libres : indiquer le chevauchement horaire et la disponibilité explicitement

**Dans les évaluations (scoring) :**
- Dimension télétravail pour du hybride hors de ta province : Score **3.0** (pas 1.0)
- Score 1.0 uniquement si l'offre dit explicitement "présence obligatoire 4-5 jours/semaine, aucune exception"

### Priorité time-to-opening
- Démo fonctionnelle + métriques > perfection
- Postuler vite > apprendre davantage
- Approche 80/20, tout est timeboxé

---

## Règles globales

### JAMAIS

1. Inventer de l'expérience ou des métriques
2. Modifier `cv.md` ou les fichiers portfolio
3. Soumettre des candidatures au nom du candidat
4. Partager un numéro de téléphone dans les messages générés
5. Recommander une rémunération en dessous du marché
6. Générer un PDF sans avoir lu l'offre avant
7. Utiliser du jargon corporate ou des formules creuses
8. Ignorer le tracker (chaque offre évaluée est enregistrée)

### TOUJOURS

0. **Lettre de présentation :** Si le formulaire le permet, TOUJOURS en inclure une. PDF dans le même design visuel que le CV. Citations de l'offre mappées sur les proof points. 1 page max.
1. Lire `cv.md` et `article-digest.md` (si existant) avant d'évaluer une offre
1b. **Première évaluation de chaque session :** Lancer `node cv-sync-check.mjs` via Bash. En cas d'alertes, prévenir le candidat
2. Détecter l'archétype du rôle et adapter le framing
3. Citer des lignes exactes du CV lors du matching
4. Utiliser WebSearch pour les données de rémunération et d'entreprise
5. Enregistrer dans le tracker après chaque évaluation
6. Générer le contenu dans la langue de l'offre (français si l'offre est en français, anglais sinon)
7. Être direct et concret -- pas de blabla
8. Français québécois naturel pour les textes générés. Phrases courtes, verbes d'action, éviter le passif. Ne pas traduire de force les termes techniques (stack, pipeline, deployment, embedding)
8b. **URLs de case studies dans le Professional Summary du PDF :** Si le PDF mentionne des case studies ou démos, les URLs DOIVENT apparaître dans le premier paragraphe (Professional Summary). Les recruteurs ne lisent souvent que le summary. Toutes les URLs en HTML avec `white-space: nowrap`
9. **Entrées tracker en TSV** -- NE JAMAIS éditer applications.md directement pour de nouveaux ajouts. Écrire le TSV dans `batch/tracker-additions/`, `merge-tracker.mjs` gère la fusion
10. **`**URL:**` dans chaque en-tête de report** -- entre Score et PDF

### Outils

| Outil | Usage |
|-------|-------|
| WebSearch | Recherche rémunération, tendances, culture d'entreprise, contacts LinkedIn, fallback offres |
| WebFetch | Fallback pour extraire les offres depuis des pages statiques |
| Playwright | Vérifier si les offres sont actives (browser_navigate + browser_snapshot), extraire les offres depuis des SPAs. **CRITIQUE : JAMAIS 2+ agents en parallèle avec Playwright -- ils partagent la même instance navigateur** |
| Read | cv.md, article-digest.md, cv-template.html |
| Write | HTML temporaire pour PDF, applications.md, reports .md |
| Edit | Mettre à jour le tracker |
| Bash | `node generate-pdf.mjs` |
