import { test, expect, type Page } from '@playwright/test'

test.describe('SSSP Demo', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('/')
    await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 10_000 })
  })

  test.afterAll(async () => {
    await page.close()
  })

  const waitForGraph = async () => {
    await page.waitForFunction(
      () => document.body.textContent?.includes('intersections loaded'),
      { timeout: 45_000 },
    )
  }

  test('renders map and control panel on load', async () => {
    const canvas = page.locator('canvas.maplibregl-canvas')
    await expect(canvas).toBeVisible()

    await expect(page.getByText('Breaking the Sorting Barrier')).toBeVisible()
    await expect(page.getByText('Duan, Mao, Mao, Shu, Yin')).toBeVisible()
    await expect(page.getByText('STOC 2025 Best Paper')).toBeVisible()

    await expect(page.getByText('Dijkstra (1956)')).toBeVisible()
    await expect(page.getByText('A* Search')).toBeVisible()
    await expect(page.getByText('Duan et al. (2025)')).toBeVisible()

    await expect(page.getByText('Lower Manhattan')).toBeVisible()
    await expect(page.locator('input[type="range"]')).toBeVisible()

    const runBtn = page.getByRole('button', { name: 'Run' })
    await expect(runBtn).toBeVisible()
    await expect(runBtn).toBeDisabled()

    await page.screenshot({ path: 'e2e/screenshots/01-initial-load.png' })
  })

  test('loads road graph from Overpass API', async () => {
    await waitForGraph()

    const nodeText = page.locator('text=/\\d+.*intersections loaded/')
    await expect(nodeText).toBeVisible()

    await expect(page.getByText('Click the map to set a start point')).toBeVisible()

    await page.screenshot({ path: 'e2e/screenshots/02-graph-loaded.png' })
  })

  test('click map sets source and target markers', async () => {
    await waitForGraph()

    const canvas = page.locator('canvas.maplibregl-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
    await page.waitForTimeout(500)

    await expect(page.getByText('Click the map to set a destination')).toBeVisible()

    await page.screenshot({ path: 'e2e/screenshots/03-source-set.png' })

    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)
    await page.waitForTimeout(500)

    const runBtn = page.getByRole('button', { name: 'Run' })
    await expect(runBtn).toBeEnabled()

    await page.screenshot({ path: 'e2e/screenshots/04-target-set.png' })
  })

  test('full pathfinding flow: click, run, animate, results', async () => {
    // Reset first to start clean
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.waitForTimeout(300)
    await waitForGraph()

    const canvas = page.locator('canvas.maplibregl-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.15)
    await page.waitForTimeout(500)

    await expect(page.getByText('Click the map to set a destination')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.85)
    await page.waitForTimeout(500)

    await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled()

    await page.screenshot({ path: 'e2e/screenshots/05-before-run.png' })

    await page.locator('input[type="range"]').fill('100')

    await page.getByRole('button', { name: 'Run' }).click()

    await page.waitForTimeout(200)
    await page.screenshot({ path: 'e2e/screenshots/06-mid-animation.png' })

    await expect(page.getByText('Results')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Nodes Explored')).toBeVisible()
    await expect(page.getByText('Comparisons', { exact: true })).toBeVisible()

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || ''
        const match = text.match(/Nodes Explored\s*([\d,]+)/)
        return match && parseInt(match[1].replace(/,/g, '')) > 1
      },
      { timeout: 5_000 },
    )

    await page.screenshot({ path: 'e2e/screenshots/07-results.png' })
  })

  test('reset clears everything', async () => {
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.waitForTimeout(300)

    await expect(page.getByText('Click the map to set a start point')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run' })).toBeDisabled()

    await page.screenshot({ path: 'e2e/screenshots/08-after-reset.png' })
  })

  test('algorithm toggle works', async () => {
    const dijkstraCheckbox = page.locator('label').filter({ hasText: 'Dijkstra' }).locator('input[type="checkbox"]')
    await expect(dijkstraCheckbox).toBeChecked()
    await dijkstraCheckbox.uncheck()
    await expect(dijkstraCheckbox).not.toBeChecked()

    const astarCheckbox = page.locator('label').filter({ hasText: 'A* Search' }).locator('input[type="checkbox"]')
    await astarCheckbox.uncheck()
    await expect(astarCheckbox).not.toBeChecked()

    const batchCheckbox = page.locator('label').filter({ hasText: 'Duan et al.' }).locator('input[type="checkbox"]')
    await expect(batchCheckbox).toBeChecked()

    // Re-enable for subsequent tests
    await dijkstraCheckbox.check()
    await astarCheckbox.check()
  })

  test('city preset switches location', async () => {
    await page.getByRole('button', { name: 'Paris (Latin Quarter)' }).click()

    await waitForGraph()

    await page.screenshot({ path: 'e2e/screenshots/09-paris.png' })
  })
})
