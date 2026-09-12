# `@taqlyn/nav-expo-router`

Optional Expo Router helpers for Taqlyn deep links.

- `mapDeferredLinkToHref(link)` — path + query from `DeferredLink`
- `navigateDeferredLink(link, router)` — `router.replace` once per `linkId`
- `createTaqlynLinking({ prefixes, scheme })` — Expo / expo-linking prefixes
- `nativeIntentRedirect(url, { prefixes })` — for `app/+native-intent.tsx`
- `TaqlynPendingHref` — hold href until auth/onboarding
- `subscribeWarmLinks(linking, onUrl)` — injected expo-linking / RN Linking
- `whenReadyNavigate(onReady)` — ready-gate bootstrap hook

**Non-goals:** Match / resolve / Install Referrer / pasteboard. Pair with `@taqlyn/sdk-react-native` (`observePlatformLinks` + `resolveDeferred` clipboard on iOS).

When Expo Router already routes Universal / App Links, set SdkCore `linkProcessingMode: 'deferred-only'`.
