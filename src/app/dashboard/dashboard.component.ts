import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, Droplets, Flame, Play, X, Zap, CirclePlay } from 'lucide-angular';
import { DemoService } from '../services/demo.service';
import { AuthService } from '../services/auth.service';
import { HybridStorageService } from '../services/hybrid-storage.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LucideAngularModule, NgTemplateOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly demoService = inject(DemoService);
  protected readonly authService = inject(AuthService);
  protected readonly hybridStorageService = inject(HybridStorageService);

  protected readonly DropletsIcon = Droplets;
  protected readonly FlameIcon = Flame;
  protected readonly PlayIcon = Play;
  protected readonly XIcon = X;
  protected readonly ZapIcon = Zap;
  protected readonly CirclePlayIcon = CirclePlay;

  protected activateDemo(): void {
    this.demoService.activateDemo();
  }

  protected deactivateDemo(): void {
    this.demoService.deactivateDemo();
  }
}
