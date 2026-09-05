import { Component, Input } from '@angular/core';

@Component({
  selector: 'lucide-icon',
  template: '',
  standalone: true,
})
export class MockLucideIconComponent {
  @Input() name?: string;
  @Input() img?: unknown;
  @Input() size?: string | number;
  @Input() color?: string;
  @Input() strokeWidth?: string | number;
  @Input() class?: string;
}
