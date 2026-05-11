# career-ops -- Modes français québécois (`modes/fr-ca/`)

Ce dossier contient les traductions québécoises des principaux modes career-ops pour les candidats qui ciblent le **marché du Québec et du Canada français**.

## Quand utiliser ces modes ?

Utilise `modes/fr-ca/` si au moins une de ces conditions est remplie :

- Tu postules principalement à des **offres d'emploi au Québec ou au Canada français** (LinkedIn CA, Indeed.ca, Jobboom, Workopolis FR)
- Ton **CV est en français québécois** ou tu alternes entre FR-QC et EN selon l'offre
- Tu as besoin de réponses et lettres de motivation en **français québécois naturel**
- Tu dois gérer des **spécificités contractuelles québécoises** : emploi permanent/CDD, assurance-emploi, régime de retraite (REER), congés fériés, avantages sociaux, Loi sur les normes du travail

Si la plupart de tes offres sont en anglais, reste sur les modes standard dans `modes/`. Les modes anglais fonctionnent pour les offres québécoises, mais ne connaissent pas les spécificités du marché québécois en détail.

## Comment activer ?

### Option 1 -- Par session

Dis à Claude en début de session :

> "Utilise les modes français québécois sous `modes/fr-ca/`."

Claude lira alors les fichiers de ce dossier au lieu de `modes/`.

### Option 2 -- En permanence

Ajoute dans `config/profile.yml` :

```yaml
language:
  primary: fr
  region: ca
  modes_dir: modes/fr-ca
```

Rappelle-le à Claude lors de ta première session ("Regarde dans `profile.yml`, j'ai configuré `language.modes_dir`"). Claude utilisera automatiquement les modes québécois.

## Quels modes sont traduits ?

Cette première itération couvre les quatre modes à plus fort impact :

| Fichier | Traduit depuis | Rôle |
|---------|----------------|------|
| `_shared.md` | `modes/_shared.md` (EN) avec contexte QC | Contexte partagé, archétypes, règles globales, spécificités marché québécois |
| `offre.md` | `modes/oferta.md` (ES) adapté QC | Évaluation complète d'une offre (Blocs A-F) avec terminologie QC |
| `postuler.md` | `modes/apply.md` (EN) adapté QC | Assistant live pour remplir les formulaires de candidature |
| `pipeline.md` | `modes/pipeline.md` (ES) adapté QC | Inbox d'URLs / Second Brain pour les offres collectées |

Les autres modes (`scan`, `batch`, `pdf`, `tracker`, `auto-pipeline`, `deep`, `contact`, `project`, `training`) restent en EN/ES. Leur contenu est surtout du tooling, des chemins et des commandes -- il doit rester indépendant de la langue.

## Ce qui reste en anglais

Volontairement non traduit car vocabulaire tech standard :

- `cv.md`, `pipeline`, `tracker`, `report`, `score`, `archetype`, `proof point`
- Noms d'outils (`Playwright`, `WebSearch`, `WebFetch`, `Read`, `Write`, `Edit`, `Bash`)
- Valeurs de statut dans le tracker (`Evaluated`, `Applied`, `Interview`, `Opening`, `Rejected`)
- Extraits de code, chemins, commandes

## Lexique de référence québécois

Pour garder un ton cohérent si tu modifies ou étends les modes. **IMPORTANT : Ces termes reflètent l'usage québécois, pas la traduction française.**

| Anglais | Français québécois | Notes |
|---------|-------------------|-------|
| Job posting | Offre d'emploi / Annonce | Standard |
| Application | Candidature / Demande d'emploi | "Demande d'emploi" moins courant en QC modernes |
| Cover letter | Lettre de présentation | Pas "lettre de motivation" au QC |
| Resume / CV | CV | Standard |
| Salary | Salaire | Standard |
| Compensation / Benefits package | Rémunération / Avantages sociaux | Au QC : rémunération + avantages |
| Skills | Compétences | Standard |
| Interview | Entrevue | "Entretien" est FR, pas QC |
| Hiring manager | Gestionnaire d'embauche / Superviseur | Plus courant que "hiring manager" |
| Recruiter | Recruteur | Standard, mais souvent "spécialiste en ressources humaines" |
| Remote / Work from home | Télétravail / Travail à domicile | Standard au QC |
| Notice period | Préavis | Standard |
| Probation | Période probatoire / Période d'essai | "Période probatoire" plus courant au QC |
| Permanent employment | Emploi permanent / Contrat permanent | Pas de "CDI" au QC |
| Fixed-term contract | Contrat à durée déterminée / CDD | Moins courant au QC |
| Freelance | Travail autonome / Travail à contrat | "Freelance" commence à être utilisé |
| Benefits / Health insurance | Avantages sociaux / Assurance-maladie | Plus large au QC que "mutuelle" |
| Disability/life insurance | Assurance-invalidité / Assurance-vie | Standard |
| Vacation / Paid time off | Congés payés / Congés annuels | Minimum 2-3 semaines par loi |
| Public holidays | Jours fériés / Congés fériés | Standard |
| Retirement / Pension plan | Régime de retraite / REER | REER = Régime enregistré d'épargne-retraite |
| Unemployment insurance | Assurance-emploi | Pas "allocation chômage" au QC |
| Labor law | Loi sur les normes du travail | Code du travail = France, Loi sur les normes = QC |
| Works council / Union | Syndicat / Comité paritaire | Dépend du secteur |
| Stock options | Options d'achat d'actions | Standard |
| Signing bonus | Prime de signature / Prime de démarrage | Moins courant au QC |
| Annual review | Évaluation de rendement / Révision annuelle | Standard |
| Professional development | Développement professionnel | Standard |
| Paid professional development | Perfectionnement professionnel payé | Standard |

## Différences clés QC vs FR

### Contexte légal et contractuel

| Aspect | Québec | France |
|--------|--------|--------|
| Loi applicable | Loi sur les normes du travail + Code civil | Code du travail |
| Contrat standard | Lettre d'embauche (souvent oral + implicite) | CDI / CDD formels |
| Notice period | Minimum 2 semaines (ou selon contrat) | 2 semaines / 1-3 mois typique |
| Vacation minimum | 2 semaines (après 1 an) | 5 semaines légales (25 jours) |
| Unemployment insurance | Assurance-emploi (fédéral) | Allocation chômage (state) |
| Tax-deferred retirement | REER (Régime enregistré épargne-retraite) | Plan retraite collectif ou privé |
| Public holidays | 9 jours fériés | 11 jours fériés |

### Terminologie avantages sociaux

- **QC :** Avantages sociaux complets = assurance-santé, assurance-invalidité, assurance-vie, régime de retraite
- **FR :** Mutuelle d'entreprise + prévoyance + 13e mois + RTT + titres-restaurant

Au QC, on ne parle pas de "13e mois" (pas de tradition) ni de "RTT" (c'est un système FR spécifique).

## Contribuer

Pour améliorer une traduction ou ajouter un mode :

1. Ouvre une Issue avec ta proposition (voir `CONTRIBUTING.md`)
2. Respecte le lexique ci-dessus pour garder le ton cohérent
3. Traduis de manière idiomatique -- pas de traduction mot à mot du français métropolitain
4. Conserve les éléments structurels (Blocs A-F, tableaux, blocs de code, instructions outils) à l'identique
5. Teste avec une vraie offre québécoise (LinkedIn.ca, Indeed.ca, Jobboom) avant de soumettre la PR

## Pour les mainteneurs

Si tu étends `modes/fr/` (France), considère de synchroniser les changements structurels avec `modes/fr-ca/` mais **conserve le lexique québécois intact** -- ne pas forcer la terminologie FR métropolitaine.
