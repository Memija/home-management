import { ComponentHarness } from '@angular/cdk/testing';

export class ConsumptionInputHarness extends ComponentHarness {
  static hostSelector = 'app-consumption-input';

  private getTitleElement = this.locatorFor('.title-with-help h2');
  private getSaveButton = this.locatorFor('button.save-btn');
  private getCancelButton = this.locatorForOptional('button.cancel-btn');
  private getWarningMessage = this.locatorForOptional('.warning-message:not(.error-message)');
  private getErrorMessage = this.locatorForOptional('.warning-message.error-message');
  private getInputs = this.locatorForAll('input[type="number"]');

  async getTitleText(): Promise<string> {
    const title = await this.getTitleElement();
    return title.text();
  }

  async getInputValue(fieldId: string): Promise<string> {
    const input = await this.locatorForOptional(`input#${fieldId}`)();
    if (!input) {
      throw new Error(`Input field with id "${fieldId}" not found`);
    }
    return input.getProperty<string>('value');
  }

  async setInputValue(fieldId: string, value: string | number): Promise<void> {
    const input = await this.locatorForOptional(`input#${fieldId}`)();
    if (!input) {
      throw new Error(`Input field with id "${fieldId}" not found`);
    }
    await input.clear();
    if (value !== '') {
      await input.sendKeys(String(value));
    }
  }

  async getInputCount(): Promise<number> {
    const inputs = await this.getInputs();
    return inputs.length;
  }

  async clickSave(): Promise<void> {
    const btn = await this.getSaveButton();
    await btn.click();
  }

  async clickCancel(): Promise<void> {
    const btn = await this.getCancelButton();
    if (!btn) {
      throw new Error('Cancel button is not visible');
    }
    await btn.click();
  }

  async hasDateWarning(): Promise<boolean> {
    return (await this.getWarningMessage()) !== null;
  }

  async hasError(): Promise<boolean> {
    return (await this.getErrorMessage()) !== null;
  }

  async getErrorText(): Promise<string> {
    const errorEl = await this.getErrorMessage();
    return errorEl ? await errorEl.text() : '';
  }
}
