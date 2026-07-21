# Phase 2 : tests du formulaire de contact

Formulaire branché sur l'Edge Function Supabase `contact-submit` :
`https://ofsmrflyjxrxmwcndymt.supabase.co/functions/v1/contact-submit`

Fichier concerné : `contact.html`.

## Avant de tester

1. Remplacer le placeholder `SITEKEY_HCAPTCHA_A_REMPLACER` dans `contact.html` par la vraie Sitekey hCaptcha (Proton Pass, entrée "hCaptcha FortHeC°"). Cette clé est publique, elle peut rester dans le repo.
2. Lancer un serveur local depuis la racine du repo :
   ```cmd
   python -m http.server 8000
   ```
3. Ouvrir `http://localhost:8000/contact.html`.

## Test 1 : soumission sans hCaptcha coché

- Remplir tous les champs obligatoires (prénom, nom, email, entreprise, secteur).
- Ne pas cocher la case hCaptcha.
- Cliquer sur "Envoyer la demande".
- Attendu : message "Veuillez cocher la case pour vérifier que vous n'êtes pas un robot." au-dessus du formulaire, aucun appel réseau envoyé.

## Test 2 : soumission complète valide

- Remplir tous les champs.
- Cocher la case hCaptcha (challenge visuel possible selon la config du compte).
- Cliquer sur "Envoyer la demande".
- Attendu : bouton passe en "Envoi en cours...", champs désactivés, puis message de succès "Merci {prénom}, votre demande est bien reçue" avec l'email saisi repris dans le texte.
- Vérifications côté backend (à faire par l'utilisateur) :
  - Ligne insérée dans la table `contact_submissions` (SQL Editor Supabase).
  - Email de notification reçu sur `contact@forthec.fr`.
  - Email d'auto-réponse reçu sur l'adresse prospect utilisée pour le test.

## Test 3 : champ obligatoire manquant

- Laisser le champ Email vide (ou tout autre champ obligatoire), remplir le reste et cocher le hCaptcha.
- Cliquer sur "Envoyer la demande".
- Attendu : le formulaire bloque l'envoi côté client avec le message "Merci de renseigner tous les champs obligatoires avant d'envoyer votre demande." (validation avant même l'appel réseau).
- Si ce contrôle est contourné (ex : appel direct à l'API), l'Edge Function doit renvoyer 400, et le site affiche alors "Certains champs ne sont pas correctement remplis. Vérifiez et réessayez."

## Test 4 : rate limit

- Soumettre le formulaire 4 fois de suite avec des données valides en moins d'une heure.
- Attendu : la 4e tentative renvoie 429, et le site affiche "Vous avez déjà envoyé plusieurs demandes récemment. Merci de réessayer dans une heure ou de nous contacter directement à contact@forthec.fr."

## Troubleshooting

- **Erreur CORS dans la console (F12)** : vérifier que `http://localhost:8000` (ou le port utilisé) correspond bien au pattern `http://localhost:*` whitelisté côté Edge Function en Phase 1.
- **Le widget hCaptcha ne s'affiche pas** : ouvrir F12 → Network, vérifier que `https://js.hcaptcha.com/1/api.js` charge bien (200), et que le placeholder `SITEKEY_HCAPTCHA_A_REMPLACER` a bien été remplacé par la vraie Sitekey.
- **Aucun email reçu** : vérifier les spams des deux boîtes (notification et auto-réponse), puis la config SPF/DKIM/DMARC (déjà validée en Phase 1).

## Après validation en local

1. `git add .`
2. `git commit -m "Phase 2: branchement formulaire contact vers Edge Function contact-submit + hCaptcha"`
3. `git push origin main`
4. Redéployer sur le VPS (méthode habituelle : `git pull` puis copie des fichiers vers `/var/www/site/`, ne pas oublier les nouveaux dossiers/fichiers touchés).
5. Refaire les tests 1 à 4 directement sur `https://forthec.fr/contact.html` (pas en local).
6. Confirmer la réception des emails côté `contact@forthec.fr`.
