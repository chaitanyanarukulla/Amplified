import { test, expect } from '@playwright/test';
import { DocumentsPage } from '../pages/documents.page';
import { MeetingAssistantPage } from '../pages/meetingAssistant.page';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';
import path from 'path';
import fs from 'fs';

test.describe('Meeting Documents / Context', () => {
    let documentsPage: DocumentsPage;
    let meetingPage: MeetingAssistantPage;

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await mockApi(page);
        documentsPage = new DocumentsPage(page);
        meetingPage = new MeetingAssistantPage(page);
        const navPage = new NavPage(page);
        await navPage.goto();
        await navPage.navigateToMeetingAssistant();
    });

    test('should upload a document and display it', async ({ page }) => {
        // Verify section title
        await expect(page.getByText('Meeting Documents').or(page.getByText('Meeting Context'))).toBeVisible();

        // Create a dummy file
        const fileName = 'test-doc.txt';
        const fileContent = 'This is a test document content.';
        const filePath = path.resolve(fileName);

        // Write file using imported fs
        fs.writeFileSync(filePath, fileContent);

        try {
            // Switch to Documents tab if needed (assuming it's a tab or section)
            // If it's a tab:
            const docTab = page.getByTestId('tab-meeting-documents');
            await docTab.waitFor({ state: 'visible' });
            await docTab.click();

            // Wait for tab content to load
            await page.waitForTimeout(500);

            // The input ID is meeting-doc-upload
            const fileInput = page.locator('#meeting-doc-upload');
            await fileInput.setInputFiles(filePath);

            // Wait for upload to complete
            await page.getByText('Uploaded Successfully!').waitFor({ state: 'visible', timeout: 5000 });

            // Verify it appears in the list (based on mock response)
            await documentsPage.verifyDocumentVisible(fileName);
        } finally {
            // Cleanup
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    });
});
