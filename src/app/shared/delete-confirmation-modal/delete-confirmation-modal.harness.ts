import { ComponentHarness } from '@angular/cdk/testing';

export class DeleteConfirmationModalHarness extends ComponentHarness {
  static hostSelector = 'app-delete-confirmation-modal';

  private getOverlay = this.locatorForOptional('.modal-overlay');
  private getTitleElement = this.locatorForOptional('.modal-header h3');
  private getMessageElement = this.locatorForOptional('.modal-body p');
  private getConfirmButton = this.locatorForOptional('button.btn-danger');
  private getCancelButton = this.locatorForOptional('button.btn-secondary');
  private getCloseButton = this.locatorForOptional('button.close-btn');

  async isOpen(): Promise<boolean> {
    return (await this.getOverlay()) !== null;
  }

  async getTitleText(): Promise<string> {
    const title = await this.getTitleElement();
    return title ? await title.text() : '';
  }

  async getMessageText(): Promise<string> {
    const message = await this.getMessageElement();
    return message ? await message.text() : '';
  }

  async clickConfirm(): Promise<void> {
    const btn = await this.getConfirmButton();
    if (!btn) {
      throw new Error('Confirm button not found or modal is closed');
    }
    await btn.click();
  }

  async clickCancel(): Promise<void> {
    const btn = await this.getCancelButton();
    if (!btn) {
      throw new Error('Cancel button not found or modal is closed');
    }
    await btn.click();
  }

  async clickClose(): Promise<void> {
    const btn = await this.getCloseButton();
    if (!btn) {
      throw new Error('Close button not found or modal is closed');
    }
    await btn.click();
  }

  async clickOverlay(): Promise<void> {
    const overlay = await this.getOverlay();
    if (!overlay) {
      throw new Error('Modal overlay not found');
    }
    await overlay.click();
  }
}
