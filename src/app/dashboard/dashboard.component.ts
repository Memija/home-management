import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, Droplets, Flame, Play, X } from 'lucide-angular';
import { DemoService } from '../services/demo.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  protected readonly demoService = inject(DemoService);

  protected readonly DropletsIcon = Droplets;
  protected readonly FlameIcon = Flame;
  protected readonly PlayIcon = Play;
  protected readonly XIcon = X;

  protected activateDemo(): void {
    this.demoService.activateDemo();
  }

  protected deactivateDemo(): void {
    this.demoService.deactivateDemo();
  }
}
