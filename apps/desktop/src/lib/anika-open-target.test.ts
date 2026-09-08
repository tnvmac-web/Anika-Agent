import { describe, expect, it } from 'vitest'

import {
  normalizeAnikaOpenString,
  pathFromAnikaDeepLink,
  pathFromOpenDeepLink,
  resolveAnikaOpenPath
} from './anika-open-target'

describe('normalizeAnikaOpenString', () => {
  it('accepts hash-router paths and strips a leading hash', () => {
    expect(normalizeAnikaOpenString('/index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeAnikaOpenString('#/index-network/intent/1')).toBe('/index-network/intent/1')
  })

  it('maps plugin-scoped anika:// deep links to the same path', () => {
    expect(normalizeAnikaOpenString('anika://index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeAnikaOpenString('anika://index-network/intent/1?focus=true')).toBe(
      '/index-network/intent/1?focus=true'
    )
  })

  it('maps anika://open/… deep links by stripping the open host', () => {
    expect(normalizeAnikaOpenString('anika://open/index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeAnikaOpenString('anika://open/settings/plugins')).toBe('/settings/plugins')
  })

  it('rejects reserved anika kinds and unsafe paths', () => {
    expect(normalizeAnikaOpenString('anika://blueprint/morning-brief')).toBeNull()
    expect(normalizeAnikaOpenString('anika://plugin/install')).toBeNull()
    expect(normalizeAnikaOpenString('https://example.com/x')).toBeNull()
    expect(normalizeAnikaOpenString('/../etc/passwd')).toBeNull()
    expect(normalizeAnikaOpenString('index-network')).toBeNull()
  })
})

describe('resolveAnikaOpenPath', () => {
  it('merges structured path + params', () => {
    expect(resolveAnikaOpenPath({ path: '/index-network/intent/1', params: { focus: 'true' } })).toBe(
      '/index-network/intent/1?focus=true'
    )
  })

  it('resolves href the same as a bare string', () => {
    expect(resolveAnikaOpenPath({ href: 'anika://index-network/intent/1' })).toBe('/index-network/intent/1')
  })
})

describe('pathFromAnikaDeepLink', () => {
  it('builds the navigate path from a plugin-scoped deep-link payload', () => {
    expect(pathFromAnikaDeepLink('index-network', 'intent/1')).toBe('/index-network/intent/1')
  })

  it('builds the navigate path from anika://open/… payloads', () => {
    expect(pathFromOpenDeepLink('index-network/intent/1')).toBe('/index-network/intent/1')
    expect(pathFromAnikaDeepLink('open', 'agent/42')).toBe('/agent/42')
  })

  it('ignores reserved kinds', () => {
    expect(pathFromAnikaDeepLink('blueprint', 'morning-brief')).toBeNull()
    expect(pathFromAnikaDeepLink('plugin', 'install')).toBeNull()
  })
})
