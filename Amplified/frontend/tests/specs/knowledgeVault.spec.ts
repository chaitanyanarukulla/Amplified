import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Knowledge Vault', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await mockApi(page);
        navPage = new NavPage(page);
        await navPage.goto();
        await navPage.navigateToKnowledgeVault();
    });

    test('should display Knowledge Vault interface', async ({ page }) => {
        // Wait for header to be visible using test id
        await expect(page.getByTestId('knowledge-vault-header')).toBeVisible();

        // Verify back button (look for any button in the header area)
        const backButton = page.locator('button').first();
        await expect(backButton).toBeVisible();
    });

    test('should navigate back to dashboard', async ({ page }) => {
        // Wait for header first
        await expect(page.getByTestId('knowledge-vault-header')).toBeVisible();

        // Click first button (should be back button)
        await page.locator('button').first().click();

        // Should be back on dashboard
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();
    });

    test('should be accessible from sidebar', async ({ page }) => {
        // Navigate to dashboard first
        await navPage.dashboardLink.waitFor({ state: 'visible' });
        await navPage.dashboardLink.click();

        // Verify we're on dashboard
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();

        // Then navigate to vault from sidebar using test id
        const vaultLink = page.getByTestId('nav-item-vault');
        await vaultLink.waitFor({ state: 'visible' });
        await vaultLink.click();

        // Should see Knowledge Vault
        await expect(page.getByTestId('knowledge-vault-header')).toBeVisible();
    });
});
