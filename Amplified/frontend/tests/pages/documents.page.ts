import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class DocumentsPage extends BasePage {
    readonly uploadBtn: Locator;
    readonly fileInput: Locator;
    readonly documentsList: Locator;

    constructor(page: Page) {
        super(page);
        this.uploadBtn = page.getByTestId('btn-upload-doc');
        this.fileInput = page.locator('input[type="file"]');
        this.documentsList = page.getByTestId('documents-list');
    }

    async uploadDocument(filePath: string) {
        // Handle hidden input if necessary, or use setInputFiles on the input element directly
        await this.fileInput.setInputFiles(filePath);
        // Wait for upload success message
        await this.page.getByText('Uploaded Successfully!').waitFor({ state: 'visible' });
    }

    async verifyDocumentVisible(name: string) {
        await expect(this.documentsList).toContainText(name);
    }
}
