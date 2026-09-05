import { ComponentHarness } from '@angular/cdk/testing';

export class DatePickerHarness extends ComponentHarness {
  static hostSelector = 'app-date-picker';

  private getInputWrapper = this.locatorFor('.input-wrapper');
  private getDateDisplay = this.locatorFor('.date-display');
  private getPopup = this.locatorForOptional('.calendar-popup');
  private getMonthYear = this.locatorForOptional('.month-year');
  private getPrevButton = this.locatorForOptional('.nav-btn[title="Previous month"]');
  private getNextButton = this.locatorForOptional('.nav-btn[title="Next month"]');
  private getDayCells = this.locatorForAll('.day-cell:not(.empty)');
  private getTodayButton = this.locatorForOptional('.calendar-footer .btn-text:not(.danger)');
  private getClearButton = this.locatorForOptional('.calendar-footer .btn-text.danger');

  async getDisplayText(): Promise<string> {
    const display = await this.getDateDisplay();
    return display.text();
  }

  async isCalendarOpen(): Promise<boolean> {
    return (await this.getPopup()) !== null;
  }

  async toggleCalendar(): Promise<void> {
    const wrapper = await this.getInputWrapper();
    await wrapper.click();
  }

  async getMonthYearText(): Promise<string> {
    const monthYear = await this.getMonthYear();
    return monthYear ? await monthYear.text() : '';
  }

  async clickPrevMonth(): Promise<void> {
    const btn = await this.getPrevButton();
    if (!btn) {
      throw new Error('Prev month button not found or calendar is closed');
    }
    await btn.click();
  }

  async clickNextMonth(): Promise<void> {
    const btn = await this.getNextButton();
    if (!btn) {
      throw new Error('Next month button not found or calendar is closed');
    }
    await btn.click();
  }

  async selectDay(dayNumber: number): Promise<void> {
    const cells = await this.getDayCells();
    for (const cell of cells) {
      const text = (await cell.text()).trim();
      if (text === String(dayNumber)) {
        await cell.click();
        return;
      }
    }
    throw new Error(`Day cell with number "${dayNumber}" not found`);
  }

  async clickToday(): Promise<void> {
    const btn = await this.getTodayButton();
    if (!btn) {
      throw new Error('Today button not found or calendar is closed');
    }
    await btn.click();
  }

  async clickClear(): Promise<void> {
    const btn = await this.getClearButton();
    if (!btn) {
      throw new Error('Clear button not found or calendar is closed');
    }
    await btn.click();
  }
}
