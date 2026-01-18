// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Window Depot Goal Tracker - Preview Deployment Test', () => {

  test('should load preview deployment page', async ({ page }) => {
    // Go to preview URL (uses PLAYWRIGHT_BASE_URL env var or baseURL from config)
    const response = await page.goto('/');
    console.log('Response status:', response?.status());
    console.log('Response URL:', response?.url());
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'preview-page.png', fullPage: true });
    
    // Check if we got redirected to auth or if app loaded
    const title = await page.title();
    console.log('Page title:', title);
    
    // Log any console errors
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Browser error:', error));
    
    // Check if page has content
    const bodyText = await page.locator('body').textContent();
    console.log('Body text preview:', bodyText?.substring(0, 200));
    
    // Expect at least something on the page
    expect(title.length).toBeGreaterThan(0);
  });
  
});
