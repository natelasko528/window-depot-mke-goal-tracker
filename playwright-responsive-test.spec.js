// @ts-check
const { test, expect, devices } = require('@playwright/test');

// Helper function to check for horizontal overflow
async function checkNoHorizontalOverflow(page) {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.viewportSize().width;
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small margin for rounding
}

// Helper function to check viewport scaling
async function checkViewportScaling(page) {
  const viewport = page.viewportSize();
  const html = page.locator('html');
  
  // Check that html element respects viewport
  const htmlWidth = await html.evaluate(el => el.scrollWidth);
  expect(htmlWidth).toBeLessThanOrEqual(viewport.width + 10);
  
  // Check for meta viewport tag
  const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewportMeta).toContain('width=device-width');
  expect(viewportMeta).toContain('initial-scale=1');
}

// Helper function to test all pages
async function testAllPages(page, viewportName) {
  // Create user first
  await page.click('text=Create User');
  await page.fill('input[placeholder*="name"]', `Test ${viewportName}`);
  await page.click('button:has-text("Create")');
  await page.waitForSelector('h2:has-text("Today\'s Progress")', { timeout: 10000 });
  
  const pages = [
    { name: 'Dashboard', selector: 'h2:has-text("Today\'s Progress")' },
    { name: 'Goals', nav: 'Goals', selector: 'h2:has-text("Goals")' },
    { name: 'Appointments', nav: 'Appointments', selector: 'h2:has-text("Appointments")' },
    { name: 'Feed', nav: 'Feed', selector: 'h2:has-text("Feed")' },
    { name: 'Leaderboard', nav: 'Leaderboard', selector: 'h2:has-text("Leaderboard")' },
    { name: 'History', nav: 'History', selector: 'h2:has-text("Stats History")' },
    { name: 'Settings', nav: 'Settings', selector: 'h2:has-text("Settings")' },
  ];
  
  for (const pageInfo of pages) {
    if (pageInfo.nav) {
      await page.click(`text=${pageInfo.nav}`);
      await page.waitForSelector(pageInfo.selector, { timeout: 5000 });
    }
    
    // Check for horizontal overflow
    await checkNoHorizontalOverflow(page);
    
    // Check that content is visible
    await expect(page.locator(pageInfo.selector)).toBeVisible();
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: `test-results/${viewportName}-${pageInfo.name.replace(/\s+/g, '-')}.png`,
      fullPage: true 
    });
  }
}

// Mobile Tests (320px - 480px)
test.describe('Mobile Viewport Tests (320px - 480px)', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    await checkViewportScaling(page);
  });

  test('should not have horizontal overflow on user selection', async ({ page }) => {
    await checkNoHorizontalOverflow(page);
    await expect(page.locator('h1')).toContainText('Window Depot');
  });

  test('should scale properly on user selection screen', async ({ page }) => {
    const container = page.locator('div').filter({ hasText: 'Window Depot' }).first();
    const boundingBox = await container.boundingBox();
    const viewport = page.viewportSize();
    
    // Container should fit within viewport
    expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);
  });

  test('should test all pages on mobile without overflow', async ({ page }) => {
    await testAllPages(page, 'Mobile-375x667');
  });

  test('should have responsive header on mobile', async ({ page }) => {
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Mobile Header');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h1:has-text("Window Depot Milwaukee")');
    
    const header = page.locator('h1:has-text("Window Depot Milwaukee")');
    await expect(header).toBeVisible();
    
    const headerText = await header.textContent();
    expect(headerText.length).toBeGreaterThan(0);
    
    await checkNoHorizontalOverflow(page);
  });

  test('should have responsive bottom navigation on mobile', async ({ page }) => {
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Mobile Nav');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    // Bottom nav should be visible and not overflow
    const bottomNav = page.locator('[style*="position: fixed"][style*="bottom: 0"]').first();
    await expect(bottomNav).toBeVisible();
    
    const navBox = await bottomNav.boundingBox();
    const viewport = page.viewportSize();
    expect(navBox.width).toBeLessThanOrEqual(viewport.width);
    
    await checkNoHorizontalOverflow(page);
  });

  test('should handle small mobile viewport (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    
    await checkViewportScaling(page);
    await checkNoHorizontalOverflow(page);
    
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Small Mobile');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    await checkNoHorizontalOverflow(page);
  });
});

// Tablet Tests (481px - 768px)
test.describe('Tablet Viewport Tests (481px - 768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad size
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper viewport meta tag on tablet', async ({ page }) => {
    await checkViewportScaling(page);
  });

  test('should not have horizontal overflow on tablet', async ({ page }) => {
    await checkNoHorizontalOverflow(page);
  });

  test('should test all pages on tablet without overflow', async ({ page }) => {
    await testAllPages(page, 'Tablet-768x1024');
  });

  test('should scale properly on medium tablet (600px)', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.reload();
    
    await checkViewportScaling(page);
    await checkNoHorizontalOverflow(page);
    
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Medium Tablet');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    await checkNoHorizontalOverflow(page);
  });
});

// Desktop Tests (769px+)
test.describe('Desktop Viewport Tests (769px+)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } }); // Full HD
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper viewport meta tag on desktop', async ({ page }) => {
    await checkViewportScaling(page);
  });

  test('should not have horizontal overflow on desktop', async ({ page }) => {
    await checkNoHorizontalOverflow(page);
  });

  test('should test all pages on desktop without overflow', async ({ page }) => {
    await testAllPages(page, 'Desktop-1920x1080');
  });

  test('should scale properly on standard desktop (1366px)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.reload();
    
    await checkViewportScaling(page);
    await checkNoHorizontalOverflow(page);
    
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Desktop');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    await checkNoHorizontalOverflow(page);
  });

  test('should scale properly on large desktop (2560px)', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.reload();
    
    await checkViewportScaling(page);
    await checkNoHorizontalOverflow(page);
    
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Large Desktop');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    await checkNoHorizontalOverflow(page);
  });
});

// Cross-viewport responsive behavior tests
test.describe('Cross-Viewport Responsive Behavior', () => {
  test('should adapt when viewport changes dynamically', async ({ page }) => {
    await page.goto('/');
    
    // Start mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await checkNoHorizontalOverflow(page);
    
    // Create user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Dynamic');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for resize
    await checkNoHorizontalOverflow(page);
    
    // Resize to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await checkNoHorizontalOverflow(page);
    
    // Resize back to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await checkNoHorizontalOverflow(page);
  });

  test('should handle orientation changes', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Orientation');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await checkNoHorizontalOverflow(page);
    
    // Landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await checkNoHorizontalOverflow(page);
  });
});

// Edge case viewports
test.describe('Edge Case Viewports', () => {
  test('should handle very small viewport (280px)', async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 653 });
    await page.goto('/');
    
    await checkViewportScaling(page);
    await checkNoHorizontalOverflow(page);
  });

  test('should handle very wide viewport (3840px)', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('/');
    
    await checkViewportScaling(page);
    await checkNoHorizontalOverflow(page);
  });

  test('should handle tall narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 2000 });
    await page.goto('/');
    
    await checkViewportScaling(page);
    await checkNoHorizontalOverflow(page);
  });
});
