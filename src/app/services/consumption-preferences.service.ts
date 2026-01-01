import { Injectable, inject, signal } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { ChartView, DisplayMode } from '../shared/consumption-chart/consumption-chart.component';

@Injectable({
    providedIn: 'root'
})
export class ConsumptionPreferencesService {
    private localStorageService = inject(LocalStorageService);

    readonly chartView = signal<ChartView>(this.getStoredChartView());
    readonly displayMode = signal<DisplayMode>(this.getStoredDisplayMode());

    setChartView(view: ChartView) {
        this.chartView.set(view);
        this.localStorageService.setPreference('water_chart_view', view);
    }

    setDisplayMode(mode: DisplayMode) {
        this.displayMode.set(mode);
        this.localStorageService.setPreference('water_display_mode', mode);
    }

    private getStoredChartView(): ChartView {
        const stored = this.localStorageService.getPreference('water_chart_view');
        if (stored === 'total' || stored === 'by-room' || stored === 'by-type' || stored === 'detailed') {
            return stored;
        }
        return 'total';
    }

    private getStoredDisplayMode(): DisplayMode {
        const stored = this.localStorageService.getPreference('water_display_mode');
        if (stored === 'total' || stored === 'incremental') {
            return stored;
        }
        return 'incremental';
    }
}
