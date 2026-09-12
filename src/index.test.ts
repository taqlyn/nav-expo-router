import { describe, expect, test } from 'bun:test'
import type { DeferredLink } from '@taqlyn/sdk-contract'
import {
  mapDeferredLinkToHref,
  navigateDeferredLink,
  createTaqlynLinking,
  nativeIntentRedirect,
  TaqlynPendingHref,
  subscribeWarmLinks,
} from './index'

const link: DeferredLink = {
  url: 'https://go.example.com/home?sku=1',
  path: 'home',
  params: { sku: '1' },
  linkId: 'lnk_1',
  matchType: 'clipboard',
  isDeferred: true,
}

describe('nav-expo-router', () => {
  test('mapDeferredLinkToHref adds slash + query', () => {
    expect(mapDeferredLinkToHref(link)).toBe('/home?sku=1')
  })

  test('navigateDeferredLink dedupes by linkId', () => {
    const hrefs: string[] = []
    const consumed = new Set<string>()
    const router = { replace: (href: string) => hrefs.push(href) }
    expect(navigateDeferredLink(link, router, consumed)).toBe('/home?sku=1')
    expect(navigateDeferredLink(link, router, consumed)).toBeNull()
    expect(hrefs).toEqual(['/home?sku=1'])
  })

  test('createTaqlynLinking includes scheme prefix', () => {
    const linking = createTaqlynLinking({
      prefixes: ['https://go.example.com'],
      scheme: 'cenomimalls',
    })
    expect(linking.prefixes).toContain('cenomimalls://')
    expect(linking.filter('https://go.example.com/x')).toBe(true)
    expect(linking.filter('https://evil.example/x')).toBe(false)
  })

  test('nativeIntentRedirect maps matching hosts', () => {
    expect(
      nativeIntentRedirect('https://go.example.com/offer?sku=9', {
        prefixes: ['https://go.example.com'],
      }),
    ).toBe('/offer?sku=9')
    expect(
      nativeIntentRedirect('https://other.example/offer', {
        prefixes: ['https://go.example.com'],
      }),
    ).toBeNull()
  })

  test('TaqlynPendingHref holds until ready', () => {
    const pending = new TaqlynPendingHref()
    pending.setHref('/home')
    expect(pending.shouldHold('/splash')).toBe(true)
    pending.setReady(true)
    expect(pending.shouldHold('/splash')).toBe(false)
  })

  test('subscribeWarmLinks forwards initial + events', async () => {
    const urls: string[] = []
    let handler: ((e: { url: string }) => void) | undefined
    const linking = {
      async getInitialURL() {
        return 'https://go.example.com/init'
      },
      addEventListener(_event: 'url', h: (e: { url: string }) => void) {
        handler = h
        return { remove() {} }
      },
    }
    const stop = subscribeWarmLinks(linking, (u) => urls.push(u))
    await Promise.resolve()
    handler?.({ url: 'https://go.example.com/warm' })
    expect(urls).toEqual([
      'https://go.example.com/init',
      'https://go.example.com/warm',
    ])
    stop()
  })
})
