import { Component } from '@angular/core';
import { TranslatePipe } from '../pipes/translate.pipe';
import {
  LucideAngularModule,
  Camera,
  CheckCircle2,
  History,
  Droplets,
  Maximize2,
  Brain,
  LucideIconData,
} from 'lucide-angular';

interface ChangelogEntry {
  id: number;
  titleKey: string;
  descKey: string;
  icon: LucideIconData;
  colorClass: string;
}

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './changelog.component.html',
  styleUrl: './changelog.component.scss',
})
export class ChangelogComponent {
  readonly HistoryIcon = History;
  readonly CheckCircleIcon = CheckCircle2;

  readonly versions: { version: string; labelKey: string; entries: ChangelogEntry[] }[] = [
    {
      version: '1.1.0',
      labelKey: 'CHANGELOG.V1_1_0_LABEL',
      entries: [
        {
          id: 1,
          titleKey: 'RELEASE_PLAN.FEATURE_4_TITLE',
          descKey: 'RELEASE_PLAN.FEATURE_4_DESC',
          icon: Camera,
          colorClass: 'new-feature',
        },
        {
          id: 2,
          titleKey: 'RELEASE_PLAN.FEATURE_1_TITLE',
          descKey: 'RELEASE_PLAN.FEATURE_1_DESC',
          icon: Droplets,
          colorClass: 'enhancement-feature',
        },
        {
          id: 3,
          titleKey: 'RELEASE_PLAN.FEATURE_2_TITLE',
          descKey: 'RELEASE_PLAN.FEATURE_2_DESC',
          icon: Maximize2,
          colorClass: 'enhancement-feature',
        },
        {
          id: 4,
          titleKey: 'RELEASE_PLAN.FEATURE_3_TITLE',
          descKey: 'RELEASE_PLAN.FEATURE_3_DESC',
          icon: Brain,
          colorClass: 'prediction-feature',
        },
      ],
    },
  ];
}
