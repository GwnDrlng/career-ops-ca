# Mode : postuler -- Assistant live pour les formulaires de candidature

Mode interactif pour le moment où le candidat remplit un formulaire de candidature dans Chrome. Lit ce qui est à l'écran, charge le contexte de l'évaluation précédente de l'offre et génère des réponses personnalisées pour chaque question du formulaire.

## Prérequis

- **Idéal avec Playwright visible** : En mode visible, le candidat voit le navigateur et Claude peut interagir avec la page.
- **Sans Playwright** : le candidat partage une capture d'écran ou colle les questions manuellement.

## Workflow

```
1. DÉTECTER     -> Lire l'onglet Chrome actif (capture/URL/titre)
2. IDENTIFIER   -> Extraire entreprise + rôle depuis la page
3. RECHERCHER   -> Matcher avec les reports existants dans reports/
4. CHARGER      -> Lire le report complet + Bloc G (si existant)
5. COMPARER     -> Le rôle à l'écran correspond-il à celui évalué ? Si changement -> alerter
6. ANALYSER     -> Identifier TOUTES les questions visibles du formulaire
7. GÉNÉRER      -> Pour chaque question, générer une réponse personnalisée
8. PRÉSENTER    -> Afficher les réponses formatées pour copier-coller
```

## Étape 1 -- Détecter l'offre

**Avec Playwright :** Snapshot de la page active. Lire titre, URL et contenu visible.

**Sans Playwright :** Demander au candidat de :
- Partager une capture d'écran du formulaire (le Read tool lit les images)
- Ou coller les questions du formulaire en texte
- Ou indiquer entreprise + rôle pour qu'on cherche le contexte

## Étape 2 -- Identifier et charger le contexte

1. Extraire le nom de l'entreprise et le titre du poste depuis la page
2. Chercher dans `reports/` par nom d'entreprise (Grep case-insensitive)
3. Si match -> charger le report complet
4. Si Bloc G présent -> charger les brouillons de réponses précédents comme base
5. Si PAS de match -> alerter le candidat et proposer un auto-pipeline rapide

## Étape 3 -- Détecter les changements de rôle

Si le rôle à l'écran diffère de celui évalué :
- **Alerter le candidat** : "Le rôle a changé de [X] à [Y]. Souhaites-tu que je réévalue ou que j'adapte les réponses au nouveau titre ?"
- **Si adapter** : Ajuster les réponses au nouveau rôle sans réévaluer
- **Si réévaluer** : Lancer l'évaluation complète A-F, mettre à jour le report, régénérer le Bloc G
- **Mettre à jour le tracker** : Modifier le titre du rôle dans applications.md si nécessaire

## Étape 4 -- Analyser les questions du formulaire

Identifier TOUTES les questions visibles :
- Champs de texte libre (lettre de présentation, "pourquoi ce poste", motivation, etc.)
- Listes déroulantes (comment avez-vous connu l'entreprise, autorisation de travail, etc.)
- Oui/Non (télétravail, relocalisation, disponibilité, etc.)
- Champs de salaire (fourchette, prétentions salariales -- en CAD brut annuel)
- Champs d'upload (CV, lettre de présentation PDF, références)

Classifier chaque question :
- **Déjà répondue dans le Bloc G** -> reprendre la réponse existante
- **Nouvelle question** -> générer la réponse depuis le report + `cv.md`

## Étape 5 -- Générer les réponses

Pour chaque question, construire la réponse selon ce schéma :

1. **Contexte du report** : Utiliser les proof points du bloc B, les stories STAR du bloc F
2. **Bloc G précédent** : Si un brouillon existe, le prendre comme base et affiner
3. **Ton "Je vous choisis"** : même framework que dans l'auto-pipeline -- confiant, pas suppliant
4. **Spécificité** : citer quelque chose de concret de l'offre visible à l'écran
5. **career-ops proof point** : inclure dans "Informations complémentaires" si un tel champ existe

**Champs spécifiques aux formulaires québécois courants :**
- **Prétentions salariales (brut annuel CAD)** -> Fourchette depuis `profile.yml`, en CAD, avec mention "négociable selon le package global"
- **Date de disponibilité** -> Date réaliste tenant compte du préavis (généralement 2 semaines)
- **Autorisation de travail / Citoyenneté** -> Honnête et concis ; pour les citoyens canadiens : "Citoyen canadien" ; pour les résidents permanents : "Résident permanent du Canada"
- **Langues** -> Français (natif/courant/intermédiaire/débutant) et Anglais (idem)
- **Télétravail** -> Préciser la préférence (télétravail complet, hybride, sur site) et la zone géographique si hybride
- **Relocalisation** -> Indiquer si disponible pour relocalisation ou préférence télétravail

**Format de sortie :**

```
## Réponses pour [Entreprise] -- [Rôle]

Base : Report #NNN | Score : X.X/5 | Archétype : [type]

---

### 1. [Question exacte du formulaire]
> [Réponse prête à copier-coller]

### 2. [Question suivante]
> [Réponse]

...

---

Notes :
- [Observations sur le rôle, changements, etc.]
- [Suggestions de personnalisation que le candidat devrait vérifier]
```

## Étape 6 -- Après la candidature (optionnel)

Si le candidat confirme que la candidature est envoyée :
1. Mettre à jour le statut dans `applications.md` de "Evaluated" à "Applied"
2. Mettre à jour le Bloc G du report avec les réponses finales
3. Suggérer l'étape suivante : `/career-ops contact` pour du LinkedIn outreach vers le gestionnaire d'embauche

## Gestion du défilement

Si le formulaire a plus de questions que ce qui est visible :
- Demander au candidat de défiler et de partager une autre capture d'écran
- Ou de coller les questions restantes
- Traiter par itérations jusqu'à couvrir tout le formulaire
