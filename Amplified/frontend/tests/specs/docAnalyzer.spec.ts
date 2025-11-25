import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Document Analyzer', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await mockApi(page);
        navPage = new NavPage(page);
        await navPage.goto();

        // Navigate to Doc Analyzer via sidebar
        const docLink = page.getByTestId('nav-item-doc-analyzer');
        await docLink.waitFor({ state: 'visible' });
        await docLink.click();
        await page.waitForTimeout(1000); // Wait for transition
    });

    test('should display document list', async ({ page }) => {
        // Debug: Print all h1s
        const h1s = await page.locator('h1').allTextContents();
        console.log('Found h1s:', h1s);

        await expect(page.locator('h1').filter({ hasText: 'Document Quality Analyzer' })).toBeVisible();
        await expect(page.getByText('Test Document.pdf')).toBeVisible();
        await expect(page.getByText('Completed')).toBeVisible();
    });

    test('should view document details', async ({ page }) => {
        // Click on the document
        await page.getByText('Test Document.pdf').click();

        // Verify detail view
        await expect(page.getByText('Structured Summary', { exact: true })).toBeVisible();
        await expect(page.getByText('Test Purpose')).toBeVisible(); // From mock summary

        // Verify tabs
        await page.getByText('Risk Assessment').click();
        await expect(page.getByText('Low', { exact: true })).toBeVisible(); // From mock overall risk

        await page.getByText('Gaps & Questions').click();
        await expect(page.getByText('No gaps or ambiguities detected.')).toBeVisible(); // Empty mock

        await page.getByText('QA Report').click();
        await expect(page.getByText('QA Feature Summary')).toBeVisible();
        await expect(page.getByText('Functional')).toBeVisible();
    });

    test('should navigate back to list', async ({ page }) => {
        // Go to detail
        await page.getByText('Test Document.pdf').click();
        await expect(page.getByText('Structured Summary', { exact: true })).toBeVisible();

        // Click back
        await page.getByTestId('back-button').click();

        // Verify list
        await expect(page.locator('h1').filter({ hasText: 'Document Quality Analyzer' })).toBeVisible();
        await expect(page.getByText('Test Document.pdf')).toBeVisible();
    });
});
