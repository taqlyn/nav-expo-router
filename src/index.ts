/**
 * Thin Expo Router helpers — map DeferredLink → href, ready-gate, linking config.
 * No Match / resolve / Install Referrer / pasteboard logic.
 */

import type { DeferredLink } from '@taqlyn/sdk-contract'

export interface LinkingLike {
  getInitialURL(): Promise<string | null>
  addEventListener(
    event: 'url',
    handler: (event: { url: string }) => void,
  ): { remove(): void }
}

export interface ExpoRouterLike {
  replace: (href: string) => void
  push?: (href: string) => void
}

/** Map a resolved link to an Expo Router href (path + query). */
export function mapDeferredLinkToHref(link: DeferredLink): string {
  const path = link.path.startsWith('/') ? link.path : `/${link.path}`
  const qs = new URLSearchParams(link.params).toString()
  return qs ? `${path}?${qs}` : path
}

/**
 * Call when auth/onboarding allows navigation. Invokes `onReady` once.
 * Pair with SdkCore `setReadyForNavigation(true)` inside `onReady`.
 */
export function whenReadyNavigate(onReady: () => void): void {
  onReady()
}

/**
 * Optional: run navigation via Expo Router `router.replace` after mapping.
 * `router` is injected so this package does not depend on expo-router at build time.
 */
export function navigateDeferredLink(
  link: DeferredLink,
  router: ExpoRouterLike,
  consumed = new Set<string>(),
): string | null {
  if (consumed.has(link.linkId)) return null
  const href = mapDeferredLinkToHref(link)
  router.replace(href)
  consumed.add(link.linkId)
  return href
}

/**
 * Expo Router / expo-linking prefixes for Associated Domains + custom scheme.
 * Pass into `expo-router` linking or `+native-intent`.
 */
export function createTaqlynLinking(options: {
  prefixes: string[]
  scheme?: string
}): { prefixes: string[]; filter: (url: string) => boolean } {
  const prefixes = [...options.prefixes]
  if (options.scheme) {
    const scheme = options.scheme.replace(/:\/?\/?$/, '')
    prefixes.push(`${scheme}://`)
  }
  return {
    prefixes,
    filter: (url) => prefixes.some((p) => url.startsWith(p)),
  }
}

/**
 * Helper for `app/+native-intent.tsx` — map an incoming URL to an Expo href
 * before the first screen. Return null to let Expo continue.
 */
export function nativeIntentRedirect(
  url: string,
  options: { prefixes: string[]; mapPath?: (pathname: string, search: string) => string | null },
): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const hrefBase = `${parsed.protocol}//${parsed.host}`
  if (!options.prefixes.some((p) => url.startsWith(p) || hrefBase.startsWith(p))) {
    return null
  }
  if (options.mapPath) {
    return options.mapPath(parsed.pathname || '/', parsed.search)
  }
  const path = parsed.pathname || '/'
  return `${path}${parsed.search}`
}

export type NativeIntentResolveFn = (
  url: string,
) => Promise<{ href: string; pendingExpand?: boolean } | null>

export interface TaqlynNativeIntentOptions {
  prefixes: Array<string | RegExp>
  /** Optional default backstack/home when expand fails (Gap 1). */
  fallbackPath?: string
  /**
   * Inject SdkCore `resolveIncomingUrl` (or equivalent). When omitted, path-map only.
   * Keeps Match/HTTP out of this nav package.
   */
  resolveIncomingUrl?: NativeIntentResolveFn
  mapPath?: (pathname: string, search: string) => string | null
  /** Map expanded / path-mapped href before returning to Expo Router. */
  mapToRoute?: (href: string, originalPath: string) => string
}

function hostMatches(url: string, prefixes: Array<string | RegExp>): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  const hrefBase = `${parsed.protocol}//${parsed.host}`
  return prefixes.some((p) => {
    if (typeof p === 'string') {
      return url.startsWith(p) || hrefBase.startsWith(p)
    }
    return p.test(parsed.hostname)
  })
}

/**
 * Factory for Expo Router `redirectSystemPath` (Detour-style resolve mode).
 * Export as `redirectSystemPath` from `app/+native-intent.tsx`.
 */
export function createTaqlynNativeIntentHandler(
  options: TaqlynNativeIntentOptions,
): (args: { path: string }) => string | Promise<string> {
  const fallback = options.fallbackPath?.trim() || '/'
  return async ({ path }) => {
    const url = path
    if (!hostMatches(url, options.prefixes)) {
      return url
    }
    let href: string | null = null
    if (options.resolveIncomingUrl) {
      try {
        const resolved = await options.resolveIncomingUrl(url)
        href = resolved?.href ?? null
      } catch {
        href = fallback
      }
      if (!href) href = fallback
    } else {
      const stringPrefixes = options.prefixes.filter((p): p is string => typeof p === 'string')
      href =
        nativeIntentRedirect(url, {
          prefixes: stringPrefixes,
          mapPath: options.mapPath,
        }) ?? fallback
    }
    if (options.mapToRoute) {
      return options.mapToRoute(href, url)
    }
    return href
  }
}

/** Holds one pending href until the router is ready (auth / splash). */
export class TaqlynPendingHref {
  href: string | null = null
  ready = false
  private readonly listeners = new Set<() => void>()

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  setHref(href: string | null): void {
    this.href = href
    this.notify()
  }

  setReady(ready: boolean): void {
    if (this.ready === ready) return
    this.ready = ready
    this.notify()
  }

  /** True when a deep href should wait for auth/onboarding. */
  shouldHold(currentPath = '/'): boolean {
    if (this.ready || !this.href) return false
    if (!currentPath || currentPath === '/') return false
    return true
  }
}

/**
 * Subscribe to OS warm URLs via injected Linking (expo-linking or RN Linking).
 * Use with `linkProcessingMode: 'deferred-only'` on SdkCore to avoid double-handling.
 */
export function subscribeWarmLinks(
  linking: LinkingLike,
  onUrl: (url: string) => void,
): () => void {
  const sub = linking.addEventListener('url', ({ url }) => {
    if (url) onUrl(url)
  })
  void linking.getInitialURL().then((url) => {
    if (url) onUrl(url)
  })
  return () => {
    sub.remove()
  }
}
