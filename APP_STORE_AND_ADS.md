# Pulsebreak App Store And Ads Notes

## Revenue Design

Use ads as optional momentum, not as punishment:

- Rewarded revive after a run ends, once per run.
- Rewarded double rewards after a run ends.
- Rewarded lucky spin from the daily screen.
- Rewarded bonus mission claim after completing a mission.
- Optional rewarded coins can be added later from the cosmetics screen.
- Avoid banners during live gameplay because they make a reflex game feel cheap and increase accidental taps.
- Do not ship forced interstitial ads. Pulsebreak should remain rewarded-only.

## Native iOS Path

1. Replace `com.yourstudio.pulsebreak` in `capacitor.config.json`.
2. Run `npm install`.
3. Run `npm run ios:add`.
4. Replace the placeholder rewarded AdMob unit ID in `game.js` or set `window.PULSEBREAK_AD_UNITS.rewarded` before the game loads.
5. Run `npm run ios:sync`.
6. Run `npm run ios:open`, then use Xcode to set signing, icons, launch screen, and archive for App Store Connect.

## AdMob Integration Checklist

- Create the app and ad units in AdMob.
- Use test ads until review builds are stable.
- Add the AdMob application ID to the iOS `Info.plist` after the Capacitor iOS project is generated.
- Add Google UMP consent handling before requesting ads in regions where consent is required.
- Add a privacy options entry point if Google UMP says one is required.
- Keep the web preview fallback in `game.js`; native builds should use the real SDK.

Google says UMP is used to manage privacy choices, create user messages in AdMob, check whether ads can be requested, and present privacy forms when required: https://developers.google.com/admob/ios/privacy

## App Store Review Notes

- Do not submit this as a Kids Category app if you use third-party ads.
- Keep ads age-appropriate and make rewarded prompts clearly optional.
- Add a privacy policy URL in App Store Connect and inside the app before release.
- In App Store privacy details, disclose the data collected by your app and third-party partners, including ad SDK data.
- If you add paid coin packs, remove-ads purchases, or premium unlocks, use Apple In-App Purchase for digital content.

Apple requires App Store privacy details for new apps and updates, including third-party partner practices: https://developer.apple.com/app-store/app-privacy-details/

Apple's review guidelines cover privacy policy requirements, consent, ad behavior, and in-app purchase rules: https://developer.apple.com/app-store/review/guidelines/

## Launch Polish To Do

- Replace the SVG icon with full App Store icon sizes generated from the same artwork.
- Add a privacy policy screen and link.
- Add screenshots from real devices.
- Add a short App Review note explaining that gameplay is offline and ads are rewarded-only.
- Test on at least one older iPhone and one current iPhone before upload.
