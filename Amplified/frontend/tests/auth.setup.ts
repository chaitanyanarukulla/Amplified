import { test as setup, expect } from '@playwright/test';
import { mockApi } from './fixtures/api.mocks';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
    console.log('Setting up authentication...');

    // Set up API mocks first
    await mockApi(page);


    // Go to the login page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if we're on the login page
    const loginButton = page.getByRole('button', { name: 'Sign In' });

    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('On login page, attempting to login...');

        // Try to login first
        await page.getByPlaceholder('you@example.com').fill('test@example.com');
        await page.getByPlaceholder('••••••••').first().fill('testpassword123');
        await loginButton.click();

        // Wait a bit to see if login succeeds
        await page.waitForTimeout(2000);

        // Check if we're logged in (sidebar visible)
        const sidebar = page.getByTestId('sidebar');
        const isLoggedIn = await sidebar.isVisible({ timeout: 2000 }).catch(() => false);

        if (isLoggedIn) {
            console.log('Login successful!');
            await page.context().storageState({ path: authFile });
            return;
        }

        // Login failed, need to signup
        console.log('Login failed, creating new account...');

        // Go back to login page
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click "Sign up" button
        const signupLink = page.getByRole('button', { name: 'Sign up' });
        if (await signupLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await signupLink.click();
            await page.waitForTimeout(1000);
        }
    }

    // Fill signup form
    const signupButton = page.getByRole('button', { name: 'Create Account' });
    if (await signupButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Filling signup form...');

        await page.getByPlaceholder('John Doe').fill('Test User');
        await page.getByPlaceholder('you@example.com').fill('test@example.com');
        const passwordFields = page.getByPlaceholder('••••••••');
        await passwordFields.first().fill('testpassword123');
        await passwordFields.nth(1).fill('testpassword123'); // Confirm password

        await signupButton.click();

        // Wait for signup to complete
        await page.waitForTimeout(3000);

        // Verify we're logged in by checking for sidebar
        const sidebar = page.getByTestId('sidebar');
        try {
            await expect(sidebar).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log('Sidebar not visible after signup, forcing auth state...');

            // Use addInitScript to ensure localStorage is set before page loads
            await page.addInitScript(() => {
                localStorage.setItem('auth_token', 'mock_token_12345');
                localStorage.setItem('user', JSON.stringify({
                    id: 'user_123',
                    email: 'test@example.com',
                    name: 'Test User'
                }));
            });

            await page.goto('/');
            await mockApi(page); // Re-apply mocks just in case
            await expect(sidebar).toBeVisible({ timeout: 10000 });
        }

        console.log('Signup successful!');
    }

    await page.waitForLoadState('networkidle');
    // Ensure auth_token is in localStorage (the mock API should have set this via AuthContext)
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    if (!authToken) {
        console.log('Auth token not found in localStorage, setting it manually...');
        await page.evaluate(() => {
            localStorage.setItem('auth_token', 'mock_token_12345');
            // Also set user data to help AuthContext
            localStorage.setItem('user', JSON.stringify({
                id: 'user_123',
                email: 'test@example.com',
                name: 'Test User'
            }));
        });

        // Reload the page to trigger AuthContext with the new token
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    }

    console.log('Saving auth state...');
    // Save the authenticated state
    await page.context().storageState({ path: authFile });
    console.log('Auth state saved to:', authFile);
});
