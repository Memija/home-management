import { ComponentHarness } from '@angular/cdk/testing';

export class DetailedRecordsHarness extends ComponentHarness {
  static hostSelector = 'app-detailed-records';

  private getTitle = this.locatorFor('.title-with-help h2');
  private getRecordItems = this.locatorForAll('.history-list li');
  private getNoRecordsMessage = this.locatorForOptional('.no-records-message');
  private getDeleteAllButton = this.locatorForOptional('button.delete-all-btn');
  private getEditButtons = this.locatorForAll('button.edit-btn');
  private getDeleteButtons = this.locatorForAll('button.remove-btn');
  private getCollapseToggle = this.locatorForOptional('button.collapse-toggle');

  async getTitleText(): Promise<string> {
    const title = await this.getTitle();
    return title.text();
  }

  async getRecordCount(): Promise<number> {
    const records = await this.getRecordItems();
    return records.length;
  }

  async hasNoRecordsMessage(): Promise<boolean> {
    return (await this.getNoRecordsMessage()) !== null;
  }

  async clickDeleteAll(): Promise<void> {
    const btn = await this.getDeleteAllButton();
    if (!btn) {
      throw new Error('Delete all button not found');
    }
    await btn.click();
  }

  async clickEditRecord(index: number): Promise<void> {
    const btns = await this.getEditButtons();
    if (!btns[index]) {
      throw new Error(`Edit button at index ${index} not found`);
    }
    await btns[index].click();
  }

  async clickDeleteRecord(index: number): Promise<void> {
    const btns = await this.getDeleteButtons();
    if (!btns[index]) {
      throw new Error(`Delete button at index ${index} not found`);
    }
    await btns[index].click();
  }

  async toggleCollapse(): Promise<void> {
    const toggle = await this.getCollapseToggle();
    if (!toggle) {
      throw new Error('Collapse toggle not found');
    }
    await toggle.click();
  }
}
