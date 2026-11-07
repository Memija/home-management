import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '../pipes/translate.pipe';
import {
  LucideAngularModule,
  LucideIconData,
  Droplets,
  Flame,
  Play,
  X,
  Zap,
  CirclePlay,
  RefreshCw,
} from 'lucide-angular';
import { DemoService } from '../services/demo.service';
import { AuthService } from '../services/auth.service';
import { HybridStorageService } from '../services/hybrid-storage.service';
import { NotificationService } from '../services/notification.service';
import { ConsumptionMotivationService } from '../services/consumption-motivation.service';
import {
  MotivationInsight,
  MotivationTrackerType,
  MotivationTrendState,
} from '../models/motivation.model';
import {
  getMotivationBadgeKey,
  getMotivationTrackerRoute,
  getMotivationTrendIcon,
} from '../utils/motivation-ui.utils';

export interface DashboardTrackerCard {
  readonly type: MotivationTrackerType;
  readonly route: string;
  readonly cardClass: string;
  readonly icon: LucideIconData;
  readonly titleKey: string;
  readonly descKey: string;
  readonly motivation: MotivationInsight | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LucideAngularModule, NgTemplateOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  protected readonly demoService = inject(DemoService);
  protected readonly authService = inject(AuthService);
  protected readonly hybridStorageService = inject(HybridStorageService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly motivationService = inject(ConsumptionMotivationService);

  protected readonly DropletsIcon = Droplets;
  protected readonly FlameIcon = Flame;
  protected readonly PlayIcon = Play;
  protected readonly XIcon = X;
  protected readonly ZapIcon = Zap;
  protected readonly CirclePlayIcon = CirclePlay;
  protected readonly RefreshCwIcon = RefreshCw;

  protected readonly trackerCards = computed<DashboardTrackerCard[]>(() => [
    {
      type: 'water',
      route: getMotivationTrackerRoute('water'),
      cardClass: 'water-card',
      icon: this.DropletsIcon,
      titleKey: 'DASHBOARD.WATER_TRACKER',
      descKey: 'DASHBOARD.WATER_DESC',
      motivation: this.notificationService.waterMotivation(),
    },
    {
      type: 'heating',
      route: getMotivationTrackerRoute('heating'),
      cardClass: 'heating-card',
      icon: this.FlameIcon,
      titleKey: 'DASHBOARD.HEATING_TRACKER',
      descKey: 'DASHBOARD.HEATING_DESC',
      motivation: this.notificationService.heatingMotivation(),
    },
    {
      type: 'electricity',
      route: getMotivationTrackerRoute('electricity'),
      cardClass: 'electricity-card',
      icon: this.ZapIcon,
      titleKey: 'DASHBOARD.ELECTRICITY_TRACKER',
      descKey: 'DASHBOARD.ELECTRICITY_DESC',
      motivation: this.notificationService.electricityMotivation(),
    },
  ]);

  protected async activateDemo(): Promise<void> {
    await this.demoService.activateDemo();
  }

  protected async deactivateDemo(): Promise<void> {
    await this.demoService.deactivateDemo();
  }

  protected refreshMotivation(tracker: MotivationTrackerType, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.motivationService.nextTip(tracker);
  }

  protected getMotivationIcon(state: MotivationTrendState): LucideIconData {
    return getMotivationTrendIcon(state);
  }

  protected getMotivationBadgeKey(state: MotivationTrendState): string {
    return getMotivationBadgeKey(state);
  }
}
