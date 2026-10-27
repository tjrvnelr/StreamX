import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

function relativeLuminance(token: string) {
  const channels = token.trim().split(/\s+/).map(Number).map((value) => value / 255)
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

test('home feed filters videos by category', async ({ page, isMobile }) => {
  await mkdir('reports/ui-evidence', { recursive: true })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'The quiet coast of Lofoten' })).toBeVisible()
  await expect(page.getByText('Preview mode.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `reports/ui-evidence/${isMobile ? '390x844' : '1440x900'}.png`, scale: 'css' })

  await page.getByRole('button', { name: 'Documentary' }).click()
  await expect(page.getByRole('heading', { name: 'Where the trail ends' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explore Documentary' })).toBeVisible()
})

test('mobile layout exposes the menu and search', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This check targets a mobile viewport.')
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Search videos' })).toBeVisible()
  const menu = await page.getByRole('button', { name: 'Open navigation' }).boundingBox()
  expect(menu?.width).toBeGreaterThanOrEqual(40)
  expect(menu?.height).toBeGreaterThanOrEqual(40)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Home' })).toBeVisible()
})

test('search gives a useful empty state and can be reset', async ({ page }) => {
  await page.goto('/search?q=zzzz-no-match')
  await expect(page.getByRole('heading', { name: 'No videos matched that search' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('heading', { name: 'No videos matched that search' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Watch The quiet coast of Lofoten' })).toBeVisible()
})

test('missing videos recover and upload explains the preview permission state', async ({ page }) => {
  await page.goto('/watch/not-a-video')
  await expect(page.getByRole('alert').getByText('This video may have been removed or is not available to your account.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await page.goto('/upload')
  await expect(page.getByRole('heading', { name: 'Connect your creator account' })).toBeVisible()
})

test('keyboard navigation exposes focus and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(skipLink).toBeVisible()
  expect(await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
  const animationDuration = await page.locator('.animate-fade-up').evaluate((element) => getComputedStyle(element).animationDuration)
  expect(Number.parseFloat(animationDuration)).toBeLessThan(0.001)
})

test('search suggestions support the keyboard and the theme can be changed', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('searchbox', { name: 'Search videos' })
  await search.fill('quiet')
  const suggestion = page.getByRole('option', { name: /The quiet coast of Lofoten/ })
  await expect(suggestion).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(suggestion).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'The quiet coast of Lofoten' })).toBeVisible()

  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkTokens = await page.locator('html').evaluate((element) => {
    const style = getComputedStyle(element)
    return Object.fromEntries(['--dim', '--canvas', '--surface', '--raised', '--lifted'].map((name) => [name, style.getPropertyValue(name)])) as Record<string, string>
  })
  expect(Math.min(...['--canvas', '--surface', '--raised', '--lifted'].map((name) => contrastRatio(darkTokens['--dim'], darkTokens[name])))).toBeGreaterThanOrEqual(4.5)
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const lightTokens = await page.locator('html').evaluate((element) => {
    const style = getComputedStyle(element)
    return Object.fromEntries(['--dim', '--canvas', '--surface', '--raised', '--lifted'].map((name) => [name, style.getPropertyValue(name)])) as Record<string, string>
  })
  expect(Math.min(...['--canvas', '--surface', '--raised', '--lifted'].map((name) => contrastRatio(lightTokens['--dim'], lightTokens[name])))).toBeGreaterThanOrEqual(4.5)
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
