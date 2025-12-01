import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, Droplets, Flame } from 'lucide-angular';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [RouterLink, TranslatePipe, LucideAngularModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
    protected readonly DropletsIcon = Droplets;
    protected readonly FlameIcon = Flame;
}
