# Mode : offre -- Évaluation complète A-F

Quand le candidat colle une offre (texte ou URL), TOUJOURS livrer les 6 blocs.

## Étape 0 -- Détection d'archétype

Classer l'offre dans l'un des 6 archétypes (voir `_shared.md`). Si hybride, indiquer les 2 plus proches. Cela détermine :
- Quels proof points prioriser dans le bloc B
- Comment réécrire le summary dans le bloc E
- Quelles stories STAR préparer dans le bloc F

## Bloc A -- Résumé du rôle

Tableau avec :
- Archétype détecté
- Domaine (Platform / Agentic / LLMOps / ML / Enterprise)
- Fonction (Build / Consultation / Management / Deploy)
- Séniorité
- Télétravail (Télétravail complet / Hybride / Sur site)
- Taille d'équipe (si mentionnée)
- TL;DR en 1 phrase

## Bloc B -- Match avec le CV

Lire `cv.md`. Créer un tableau où chaque prérequis de l'offre est mappé sur des lignes exactes du CV.

**Adapté à l'archétype :**
- FDE -> prioriser les proof points de livraison rapide et proximité client
- SA -> prioriser la conception système et les intégrations
- PM -> prioriser la product discovery et les métriques
- LLMOps -> prioriser évals, observabilité, pipelines
- Agentic -> prioriser multi-agent, HITL, orchestration
- Transformation -> prioriser conduite du changement, adoption, passage à l'échelle

Section **Lacunes (Gaps)** avec stratégie de mitigation pour chacune. Pour chaque lacune :
1. Est-ce un bloqueur dur ou un nice-to-have ?
2. Le candidat peut-il démontrer une expérience adjacente ?
3. Y a-t-il un projet portfolio qui couvre cette lacune ?
4. Plan de mitigation concret (phrase pour la lettre de présentation, mini-projet rapide, etc.)

## Bloc C -- Niveau et stratégie

1. **Niveau détecté** dans l'offre vs **niveau naturel du candidat pour cet archétype**
2. **Plan "vendre senior sans mentir"** : formulations spécifiques adaptées à l'archétype, réalisations concrètes à mettre en avant, comment positionner l'expérience de fondateur comme un atout
3. **Plan "si je suis downlevel"** : accepter si la rémunération est juste, négocier une revue à 6 mois, critères de promotion clairs

## Bloc D -- Rémunération et demande

Utiliser WebSearch pour :
- Salaires actuels du rôle (Glassdoor.ca, Levels.fyi, LinkedIn Salaires, PayScale Canada, Indeed.ca)
- Réputation de rémunération de l'entreprise (Glassdoor, LinkedIn)
- Tendance de demande du rôle sur le marché québécois/canadien français

Tableau avec données et sources citées. Si pas de données, le dire clairement -- ne rien inventer.

**Marché québécois -- Vérifications obligatoires :**
- Emploi permanent ou CDD ? Si CDD : durée, motif, possibilité de conversion en emploi permanent.
- Salaire brut annuel mentionné ? Inclure dans le calcul.
- Part variable (bonus, commission, stock-options) ?
- Régime de retraite mentionné ? Matching employeur en % ? (Typiquement 3-5%)
- Assurance-maladie privée offerte ? (Dentaire, vision, psychologie, famille ?)
- Assurance-invalidité / assurance-vie mentionnées ?
- Prime de signature ou prime de démarrage offerte ?
- Flexibilité télétravail mentionnée ? (Important au QC post-pandémie)
- Syndicat applicable ? Avantages additionnels ?

**Comparaison valide :**
Toujours comparer les packages bruts annuels de manière cohérente. Au Québec, les salaires sont typiquement 15-25% plus bas qu'en Ontario ou aux États-Unis pour des rôles tech comparables -- c'est attendu et normal.

## Bloc E -- Plan de personnalisation

| # | Section | État actuel | Changement proposé | Justification |
|---|---------|-------------|--------------------|----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 modifications du CV + Top 5 modifications LinkedIn pour maximiser le match.

## Bloc F -- Plan d'entretiens

6-10 stories STAR+R mappées sur les prérequis de l'offre (STAR + **Réflexion**) :

| # | Prérequis de l'offre | Story STAR+R | S | T | A | R | Réflexion |
|---|---------------------|--------------|---|---|---|---|-----------|

La colonne **Réflexion** capture ce qui a été appris ou ce qui serait fait différemment. Cela signale la séniorité -- les juniors décrivent ce qui s'est passé, les seniors en tirent des enseignements.

**Story Bank :** Si `interview-prep/story-bank.md` existe, vérifier si ces stories y sont déjà. Sinon, ajouter les nouvelles. Avec le temps, cela construit une banque réutilisable de 5-10 stories maître adaptables à n'importe quelle question d'entrevue.

**Sélectionnées et cadrées selon l'archétype :**
- FDE -> mettre en avant la vitesse de livraison et la proximité client
- SA -> mettre en avant les décisions d'architecture
- PM -> mettre en avant la discovery et les arbitrages
- LLMOps -> mettre en avant les métriques, évals, hardening en production
- Agentic -> mettre en avant l'orchestration, la gestion d'erreurs, le HITL
- Transformation -> mettre en avant l'adoption et le changement organisationnel

Inclure aussi :
- 1 case study recommandée (quel projet présenter et comment)
- Questions red-flag et comment y répondre (ex : "Pourquoi avez-vous vendu votre entreprise ?", "Aviez-vous une équipe sous votre responsabilité ?", "Pourquoi un changement après si peu de temps ?")

---

## Post-évaluation

**TOUJOURS** exécuter après les blocs A-F :

### 1. Sauvegarder le report .md

Sauvegarder l'évaluation complète dans `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = prochain numéro séquentiel (3 chiffres, zéro-padded)
- `{company-slug}` = nom d'entreprise en minuscules, sans espaces (utiliser des tirets)
- `{YYYY-MM-DD}` = date du jour

**Format du report :**

```markdown
# Évaluation : {Entreprise} -- {Rôle}

**Date :** {YYYY-MM-DD}
**Archétype :** {détecté}
**Score :** {X/5}
**URL :** {URL de l'offre}
**PDF :** {chemin ou en attente}

---

## A) Résumé du rôle
(contenu complet du bloc A)

## B) Match avec le CV
(contenu complet du bloc B)

## C) Niveau et stratégie
(contenu complet du bloc C)

## D) Rémunération et demande
(contenu complet du bloc D)

## E) Plan de personnalisation
(contenu complet du bloc E)

## F) Plan d'entretiens
(contenu complet du bloc F)

## G) Brouillons de réponses pour la candidature
(uniquement si score >= 4.5 -- brouillons de réponses pour le formulaire de candidature)

---

## Mots-clés extraits
(liste de 15-20 mots-clés de l'offre pour l'optimisation ATS)
```

### 2. Enregistrer dans le tracker

**TOUJOURS** enregistrer dans `data/applications.md` :
- Prochain numéro séquentiel
- Date du jour
- Entreprise
- Rôle
- Score : moyenne du match (1-5)
- Statut : `Evaluated`
- PDF : non (ou oui si l'auto-pipeline a généré un PDF)
- Report : lien relatif vers le fichier report (ex : `[001](reports/001-company-2026-01-01.md)`)

**Format du tracker :**

```markdown
| # | Date | Entreprise | Rôle | Score | Statut | PDF | Report |
```
