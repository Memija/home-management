import { Injectable, inject } from '@angular/core';
import { WaterAveragesService } from './water-averages.service';
import { ConsumptionRecord, HeatingRecord } from '../models/records.model';

@Injectable({
    providedIn: 'root'
})
export class ChartCalculationService {
    private waterAveragesService = inject(WaterAveragesService);

    /**
     * Calculate incremental (delta) data between consecutive readings
     */
    calculateIncrementalData(recs: (ConsumptionRecord | HeatingRecord)[]): any[] {
        if (recs.length <= 1) return recs;

        const incrementalData: any[] = [];
        for (let i = 1; i < recs.length; i++) {
            const current = recs[i];
            const previous = recs[i - 1];
            const incremental: Record<string, any> = { date: current.date };

            const currentData = current as unknown as Record<string, number>;
            const previousData = previous as unknown as Record<string, number>;

            Object.keys(current).forEach(key => {
                if (key !== 'date' && typeof currentData[key] === 'number') {
                    incremental[key] = Math.max(0, (currentData[key]) - (previousData[key] || 0));
                }
            });

            incrementalData.push(incremental);
        }

        return incrementalData;
    }

    /**
     * Calculate linear regression (least squares method) for trendline
     */
    calculateLinearRegression(dataPoints: number[]): { slope: number; intercept: number } {
        const n = dataPoints.length;
        if (n < 2) return { slope: 0, intercept: dataPoints[0] || 0 };

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += dataPoints[i];
            sumXY += i * dataPoints[i];
            sumX2 += i * i;
        }

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return { slope: 0, intercept: sumY / n };

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * Generate trendline data points from regression
     */
    generateTrendlineData(dataPoints: number[]): number[] {
        const { slope, intercept } = this.calculateLinearRegression(dataPoints);
        return dataPoints.map((_, index) => Math.round(slope * index + intercept));
    }

    /**
     * Generate comparison data based on country averages
     */
    generateComparisonData(processedData: (ConsumptionRecord | HeatingRecord)[], familySize: number, country: string): any[] {
        if (processedData.length === 0 || familySize === 0) return [];

        const countryData = this.waterAveragesService.getCountryData(country);
        const averageLitersPerPersonPerDay = countryData.averageLitersPerPersonPerDay;

        let totalDays = 0;
        if (processedData.length > 1) {
            const firstDate = new Date(processedData[0].date).getTime();
            const lastDate = new Date(processedData[processedData.length - 1].date).getTime();
            totalDays = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));
        }
        const averagePeriod = processedData.length > 1 ? totalDays / (processedData.length - 1) : 7;

        return processedData.map((current) => {
            const comparison: any = { date: current.date };
            const totalConsumption = averageLitersPerPersonPerDay * familySize * averagePeriod;

            // Distribute proportionally: Kitchen 15%, Bathroom 85%
            // Within each: Warm 40%, Cold 60%
            const kitchenTotal = totalConsumption * 0.15;
            const bathroomTotal = totalConsumption * 0.85;

            comparison['kitchenWarm'] = Math.round(kitchenTotal * 0.4);
            comparison['kitchenCold'] = Math.round(kitchenTotal * 0.6);
            comparison['bathroomWarm'] = Math.round(bathroomTotal * 0.4);
            comparison['bathroomCold'] = Math.round(bathroomTotal * 0.6);

            return comparison;
        });
    }

    /**
     * Detect potential meter changes (drops in cumulative readings)
     * Returns array of date strings where drops were detected
     */
    detectMeterChanges(records: ConsumptionRecord[]): string[] {
        if (records.length < 2) return [];

        const changes: string[] = [];
        for (let i = 1; i < records.length; i++) {
            const prevTotal = this.calculateTotal(records[i - 1]);
            const currTotal = this.calculateTotal(records[i]);

            // A drop indicates a meter change
            if (currTotal < prevTotal) {
                changes.push(new Date(records[i].date).toISOString().split('T')[0]);
            }
        }
        return changes;
    }

    /**
     * Adjust records for confirmed meter changes by applying offsets
     * This makes the chart continuous after meter replacements
     */
    adjustForMeterChanges(records: ConsumptionRecord[], confirmedChangeDates: string[]): ConsumptionRecord[] {
        if (records.length < 2 || confirmedChangeDates.length === 0) return records;

        const adjustedRecords: ConsumptionRecord[] = [];
        let cumulativeOffset = 0;

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const recordDate = new Date(record.date).toISOString().split('T')[0];

            // Check if this is a confirmed meter change point
            if (i > 0 && confirmedChangeDates.includes(recordDate)) {
                const prevTotal = this.calculateTotal(records[i - 1]);
                cumulativeOffset += prevTotal;
            }

            // Apply offset to all fields proportionally
            if (cumulativeOffset > 0) {
                const originalTotal = this.calculateTotal(record);
                const ratio = originalTotal > 0 ? 1 : 0;
                const offsetPerField = cumulativeOffset / 4; // Distribute evenly across 4 fields

                adjustedRecords.push({
                    date: record.date,
                    kitchenWarm: record.kitchenWarm + (ratio ? offsetPerField : 0),
                    kitchenCold: record.kitchenCold + (ratio ? offsetPerField : 0),
                    bathroomWarm: record.bathroomWarm + (ratio ? offsetPerField : 0),
                    bathroomCold: record.bathroomCold + (ratio ? offsetPerField : 0)
                });
            } else {
                adjustedRecords.push({ ...record });
            }
        }

        return adjustedRecords;
    }

    private calculateTotal(record: ConsumptionRecord): number {
        return record.kitchenWarm + record.kitchenCold + record.bathroomWarm + record.bathroomCold;
    }
}
