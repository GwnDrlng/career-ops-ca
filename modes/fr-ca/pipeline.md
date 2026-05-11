# Mode : pipeline -- Inbox d'URLs (Second Brain)

Traite les URLs d'offres accumulées dans `data/pipeline.md`. Le candidat ajoute des URLs quand il veut et lance ensuite `/career-ops pipeline` pour toutes les traiter d'un coup.

## Workflow

1. **Lire** `data/pipeline.md` -> trouver les items `- [ ]` dans la section "En attente" / "Pending" / "Pendientes"
2. **Pour chaque URL en attente** :
   a. Calculer le prochain `REPORT_NUM` séquentiel (lire `reports/`, prendre le numéro le plus élevé + 1)
   b. **Extraire l'offre** avec Playwright (`browser_navigate` + `browser_snapshot`) -> WebFetch -> WebSearch
   c. Si l'URL n'est pas accessible -> marquer comme `- [!]` avec une note et continuer
   d. **Exécuter l'auto-pipeline complet** : Évaluation A-F -> Report .md -> PDF (si score >= 3.0) -> Tracker
   e. **Déplacer de "En attente" vers "Traitées"** : `- [x] #NNN | URL | Entreprise | Rôle | Score/5 | PDF oui/non`
3. **Si 3+ URLs en attente**, lancer des agents en parallèle (Agent tool avec `run_in_background`) pour maximiser la vitesse.
4. **À la fin**, afficher un tableau récapitulatif :

```
| # | Entreprise | Rôle | Score | PDF | Action recommandée |
```

## Format de pipeline.md

```markdown
## En attente
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job -- Erreur : authentification requise

## Traitées
- [x] #143 | https://jobs.example.com/posting/789 | Acme Inc | AI PM | 4.2/5 | PDF oui
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF non
```

> Note : Les en-têtes de section peuvent être en EN ("Pending"/"Processed"), ES ("Pendientes"/"Procesadas"), DE ("Offen"/"Verarbeitet") ou FR ("En attente"/"Traitées"). Être flexible à la lecture, fidèle au style existant à l'écriture.

## Détection intelligente de l'offre depuis l'URL

1. **Playwright (préféré) :** `browser_navigate` + `browser_snapshot`. Fonctionne avec toutes les SPAs.
2. **WebFetch (fallback) :** Pour les pages statiques ou quand Playwright n'est pas disponible.
3. **WebSearch (dernier recours) :** Chercher sur des portails secondaires qui indexent l'offre.

**Cas particuliers :**
- **LinkedIn** : Peut nécessiter une authentification -> marquer `[!]` et demander au candidat de coller le texte
- **PDF** : Si l'URL pointe vers un PDF, le lire directement avec le Read tool
- **Préfixe `local:`** : Lire le fichier local. Exemple : `local:jds/linkedin-pm-ai.md` -> lire `jds/linkedin-pm-ai.md`
- **LinkedIn.ca / Indeed.ca / Jobboom** : Portails québécois/canadiens courants. Playwright gère bien les cookie banners
- **Portails spécialisés** : LinkedIn, Workopolis, etc. Offres bien structurées et lisibles par machine.

## Numération automatique

1. Lister tous les fichiers dans `reports/`
2. Extraire le numéro du préfixe (ex : `142-medispend...` -> 142)
3. Nouveau numéro = maximum trouvé + 1

## Synchronisation des sources

Avant de traiter une URL, vérifier la sync :

```bash
node cv-sync-check.mjs
```

En cas de désynchronisation, alerter le candidat avant de continuer.
