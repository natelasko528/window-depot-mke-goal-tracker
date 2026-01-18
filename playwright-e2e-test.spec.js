// @ts-check
const { test, expect } = require('@playwright/test');

const VERCEL_URL = process.env.VERCEL_URL || 'https://window-depot-mke-goal-tracker.vercel.app';

test.describe('Window Depot Goal Tracker - E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(VERCEL_URL);
  });

  test('should load app and show user selection', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Window Depot');
    await expect(page.locator('text=Goal Tracker')).toBeVisible();
  });

  test('should create new user and access dashboard', async ({ page }) => {
    // Create new user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test User E2E');
    await page.selectOption('select', 'employee');
    await page.click('button:has-text("Create")');
    
    // Should be on dashboard
    await expect(page.locator('h2:has-text("Today\'s Progress")')).toBeVisible({timeout: 10000});
  });

  test('should display motivational quote on dashboard', async ({ page }) => {
    // Login first
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test User Quote');
    await page.click('button:has-text("Create")');
    
    // Check for quote
    await expect(page.locator('text=Daily Motivation')).toBeVisible();
  });

  test('should increment reviews with R keyboard shortcut', async ({ page }) => {
    // Create user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Keyboard');
    await page.click('button:has-text("Create")');
    
    // Wait for dashboard
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    // Press R key
    await page.keyboard.press('r');
    
    // Should show toast
    await expect(page.locator('text=Review added')).toBeVisible({timeout: 3000});
  });

  test('should navigate to Goals via keyboard shortcut', async ({ page }) => {
    // Create user and login
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Nav');
    await page.click('button:has-text("Create")');
    
    // Ctrl+G to Goals
    await page.keyboard.press('Control+g');
    
    // Should see Goals page
    await expect(page.locator('h2:has-text("Goals")')).toBeVisible({timeout: 3000});
  });

  test('should toggle dark mode in settings', async ({ page }) => {
    // Create user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Dark Mode');
    await page.click('button:has-text("Create")');
    
    // Navigate to Settings
    await page.click('text=Settings');
    await page.waitForSelector('h2:has-text("Settings")');
    
    // Find theme dropdown
    const themeSelect = page.locator('select').filter({ hasText: /Light|Dark|System/ }).first();
    await themeSelect.selectOption('dark');
    
    // Save settings
    await page.click('button:has-text("Save Settings")');
    
    // Wait a bit for theme to apply
    await page.waitForTimeout(500);
    
    // Check if dark theme is applied (background should be dark)
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Dark mode should have darker background
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('should display leaderboard with timeframe options', async ({ page }) => {
    // Create user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Leaderboard');
    await page.click('button:has-text("Create")');
    
    // Navigate to Leaderboard
    await page.click('text=Leaderboard');
    await page.waitForSelector('h2:has-text("Leaderboard")');
    
    // Check for timeframe buttons
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('button:has-text("This Week")')).toBeVisible();
    await expect(page.locator('button:has-text("This Month")')).toBeVisible();
    await expect(page.locator('button:has-text("All Time")')).toBeVisible();
    
    // Click "This Month"
    await page.click('button:has-text("This Month")');
    
    // Leaderboard should still be visible
    await expect(page.locator('h2:has-text("Leaderboard")')).toBeVisible();
  });

  test('should create appointment with time and status', async ({ page }) => {
    // Create user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Appointments');
    await page.click('button:has-text("Create")');
    
    // Navigate to Appointments
    await page.click('text=Appointments');
    await page.waitForSelector('h2:has-text("Appointments")');
    
    // Click Add Appointment
    await page.click('button:has-text("Add Appointment")');
    
    // Fill form
    await page.fill('input[placeholder*="customer"]', 'John Doe');
    
    // Select time (if dropdown exists)
    const timeSelect = page.locator('select').first();
    await timeSelect.selectOption({index: 2}); // Select 3rd time slot
    
    // Select product
    await page.click('button:has-text("Windows")');
    
    // Save
    await page.click('button:has-text("Save Appointment")');
    
    // Should see appointment in list
    await expect(page.locator('text=John Doe')).toBeVisible({timeout: 5000});
  });

  test('should access History view and see trend chart', async ({ page }) => {
    // Create user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test History');
    await page.click('button:has-text("Create")');
    
    // Navigate to History
    await page.click('text=History');
    
    // Should see History page
    await expect(page.locator('h2:has-text("Stats History")')).toBeVisible({timeout: 5000});
    
    // Check for timeframe selector
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
  });

  test('should persist data across page reloads', async ({ page }) => {
    // Create user
    await page.click('text=Create User');
    await page.fill('input[placeholder*="name"]', 'Test Persistence');
    await page.click('button:has-text("Create")');
    
    // Wait for dashboard
    await page.waitForSelector('h2:has-text("Today\'s Progress")');
    
    // Increment a review
    await page.click('button:has-text("+")').first();
    
    // Reload page
    await page.reload();
    
    // Should still be logged in (IndexedDB persistence)
    await expect(page.locator('h2:has-text("Today\'s Progress")')).toBeVisible({timeout: 5000});
  });
});
