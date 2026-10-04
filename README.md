# Heena's Personal Diary: setup guide

Files: `index.html`, `style.css`, `script.js`, `firebase.js`, `admin.html`, `admin.js`, `firestore.rules`

1. **Create a Firebase project.** Go to console.firebase.google.com, click Add project, name it (e.g. `heenas-diary`), finish the wizard.
2. **Enable Authentication.** Build > Authentication > Get started.
3. **Sign-in method.** Sign-in method tab > Email/Password > Enable > Save.
4. **Create Firestore.** Build > Firestore Database > Create database > Production mode > pick a region near you.
5. **Get your config.** Project settings (gear) > Your apps > Web (`</>`) > register app (skip Hosting) > copy the `firebaseConfig` object.
6. **Connect to JavaScript.** Paste the values into `firebase.js`. The SDK is already loaded from the CDN by every page.
7. **Collections.** `users`, `diaryEntries` and `activityLogs` are created automatically by the app on first use. The only one you make by hand is `admins` (step 10).
8. **Security rules.** Firestore > Rules tab > replace everything with the contents of `firestore.rules` > Publish.
9. **Create the diary user.** Authentication > Users > Add user > Heena's email + password `123456`. She signs in with it, then uses Change Password at once.
10. **Create the admin.** Authentication > Add user (a *different* email and a strong password of your choosing). Copy its **User UID**. In Firestore > Start collection `admins` > Document ID = that UID > add field `role` = `admin`. Admin access lives only in this document, so no admin credentials appear in any code.
11. **Test sign-in.** Open `index.html` through a local server (`python -m http.server`) or after deploying; log in with the diary user.
12. **Test diary creation.** + Compose > fill in > Save Entry. You should see "Your memory has been saved 💚" and the card appear.
13. **Test edit/delete.** Edit changes the topic, date or text and updates `updatedAt`. Delete shows a confirmation first.
14. **Test admin.** Open `admin.html`, sign in as the admin: entries, search, date/topic filters, ordering and the full read view should work. The diary user is refused there.
15. **Test password logging.** Change Password in the diary, then check the Admin > Password Activity tab for a "Password Changed" row with date and time.
16. **Push to GitHub.** Create a repo, upload all files to the root (or `git init && git add . && git commit -m "diary" && git push`).
17. **Enable GitHub Pages.** Repo > Settings > Pages > Source: Deploy from a branch > `main` / `(root)` > Save.
18. **Get the URL.** After a minute: `https://YOUR-USERNAME.github.io/REPO-NAME/` (admin: `.../admin.html`).
19. **Authorise the domain.** Authentication > Settings > Authorized domains > add `YOUR-USERNAME.github.io` (needed for sign-in and reset emails).

Notes: "Forgot password" sends Firebase's reset email. Reset events can't be logged safely from a logged-out browser without a Cloud Function, so only password *changes* are logged.
