import { Injectable, inject, signal } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { ChartView, DisplayMode } from '../shared/consumption-chart/consumption-chart.component';

export type ChartType = 'water' | 'heating' | 'home' | 'electricity';

@Injectable({
    providedIn: 'root'
})
export class ConsumptionPreferencesService {
    private localStorageService = inject(LocalStorageService);

    // Water-specific signals (for backwards compatibility)
    readonly chartView = signal<ChartView>(this.getStoredChartView('water'));
    readonly displayMode = signal<DisplayMode>(this.getStoredDisplayMode('water'));

    // Heating-specific signals
    readonly heatingChartView = signal<ChartView>(this.getStoredChartView('heating'));
    readonly heatingDisplayMode = signal<DisplayMode>(this.getStoredDisplayMode('heating'));

    // Electricity-specific signals
    readonly electricityChartView = signal<ChartView>(this.getStoredChartView('electricity'));
    readonly electricityDisplayMode = signal<DisplayMode>(this.getStoredDisplayMode('electricity'));

    setChartView(view: ChartView, chartType: ChartType = 'water') {
        const key = `${chartType}_chart_view`;
        this.localStorageService.setPreference(key, view);
        if (chartType === 'water') {
            this.chartView.set(view);
        } else if (chartType === 'heating') {
            this.heatingChartView.set(view);
        } else if (chartType === 'electricity') {
            this.electricityChartView.set(view);
        }
    }

    setDisplayMode(mode: DisplayMode, chartType: ChartType = 'water') {
        const key = `${chartType}_display_mode`;
        this.localStorageService.setPreference(key, mode);
        if (chartType === 'water') {
            this.displayMode.set(mode);
        } else if (chartType === 'heating') {
            this.heatingDisplayMode.set(mode);
        } else if (chartType === 'electricity') {
            this.electricityDisplayMode.set(mode);
        }
    }

    getStoredChartView(chartType: ChartType = 'water'): ChartView {
        const key = `${chartType}_chart_view`;
        const stored = this.localStorageService.getPreference(key);
        if (stored === 'total' || stored === 'by-room' || stored === 'by-type' || stored === 'detailed') {
            return stored;
        }
        return 'total';
    }

    getStoredDisplayMode(chartType: ChartType = 'water'): DisplayMode {
        const key = `${chartType}_display_mode`;
        const stored = this.localStorageService.getPreference(key);
        if (stored === 'total' || stored === 'incremental') {
            return stored;
        }
        // Default: incremental for water, total for heating/electricity
        return chartType === 'heating' || chartType === 'electricity' ? 'total' : 'incremental';
    }
}
