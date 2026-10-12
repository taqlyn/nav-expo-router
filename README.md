# `@taqlyn/nav-expo-router`

Optional Expo Router helpers for Taqlyn deep links.

- `mapDeferredLinkToHref(link)` — path + query from `DeferredLink`
- `navigateDeferredLink(link, router)` — `router.replace` once per `linkId`
- `createTaqlynLinking({ prefixes, scheme })` — Expo / expo-linking prefixes
- `nativeIntentRedirect(url, { prefixes })` — for `app/+native-intent.tsx` (path-map)
- `createTaqlynNativeIntentHandler({ prefixes, resolveIncomingUrl, fallbackPath, mapToRoute })` — Gap 1 resolve mode
  - `prefixes`: `string | RegExp`
  - Inject SdkCore `resolveIncomingUrl` (keeps Match/HTTP out of this package)
- `TaqlynPendingHref` — hold href until auth/onboarding
- `subscribeWarmLinks(linking, onUrl)` — injected expo-linking / RN Linking
- `whenReadyNavigate(onReady)` — ready-gate bootstrap hook

**Non-goals:** Match / HTTP / Install Referrer / pasteboard. Pair with `@taqlyn/sdk-react-native` (`resolveIncomingUrl`, `awaitPendingExpand`, `TaqlynProvider`, `observePlatformLinks`, `resolveDeferred`).

When Expo Router already routes Universal / App Links, set SdkCore `linkProcessingMode: 'deferred-only'`.

Guides: [short-link-expand](../../docs/guides/short-link-expand.md) · [detour-parity-gaps](../../docs/guides/detour-parity-gaps.md)
