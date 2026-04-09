# Work Report iOS (MVP)

Simple mobile app for daily work reporting:
- add entries (date, project, task, hours, notes)
- see day and week hour totals
- store data locally on device
- export all entries to CSV

## Stack
- Expo + React Native + TypeScript
- AsyncStorage (local persistence)
- Expo FileSystem + Sharing (CSV export)

## Run locally
1. `cd d:\Work\IOS\work-report-ios`
2. `npm install`
3. `npm run start`

Then open the project in Expo Go for quick testing.

## Free install on iPhone (without Mac, without App Store): PWA
This is the easiest free way to get an app-like icon on iPhone.

### 1) Build web version
1. `cd d:\Work\IOS\work-report-ios`
2. `npm install`
3. `npm run web:build`

Output folder: `dist`

### 2) Deploy `dist` for free (HTTPS required)
Quick option: [Netlify Drop](https://app.netlify.com/drop)
1. Open Netlify Drop in browser
2. Drag and drop the `dist` folder
3. Get your public HTTPS link

### 3) Add to iPhone Home Screen
1. Open the HTTPS link in Safari on iPhone
2. Tap `Share`
3. Tap `Add to Home Screen`

Now the app launches from Home Screen like a regular app.
Note: this is PWA mode (not IPA), but fully free and no Mac required.

## Auto-deploy with GitHub Pages (free)
This project includes CI auto-deploy:
- `.github/workflows/deploy-gh-pages.yml`
- Trigger: each push to `main`
- Target: GitHub Pages

### One-time setup in GitHub
1. Push this project to a GitHub repository.
2. Open repository `Settings` -> `Pages`.
3. In `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main`.
5. Wait for workflow `Deploy Web App` to finish.
6. Open your site:
   - `https://<your-github-username>.github.io/<repo-name>/`

After that, every `git push` to `main` auto-updates your PWA.

## Build iOS IPA (without App Store)
On Windows, local iOS build is not available, so use cloud build:

1. Install EAS CLI:
   - `npm install -g eas-cli`
2. Login:
   - `eas login`
3. Configure build:
   - `eas build:configure`
4. Build IPA:
   - `eas build -p ios --profile preview`
5. Download `.ipa` from build link.
6. Install `.ipa` to iPhone using AltStore.

## Notes
- Free Apple ID has limitations (refresh/signing period and app limits).
- For stable long-term use, Apple Developer account is recommended.
