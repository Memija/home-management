import { HelpStep } from '../shared/help-modal/help-modal.component';
import { DemoWizardStep } from '../shared/demo-wizard/demo-wizard.component';
import { DemoTourStep } from '../shared/demo-tour/demo-tour.component';
import { BarChart3, Droplet, TrendingUp, Download } from 'lucide-angular';

export const DEMO_WIZARD_STEPS: DemoWizardStep[] = [
  {
    titleKey: 'DEMO.WATER_STEP_1_TITLE',
    descriptionKey: 'DEMO.WATER_STEP_1_DESC',
    icon: BarChart3,
  },
  { titleKey: 'DEMO.WATER_STEP_2_TITLE', descriptionKey: 'DEMO.WATER_STEP_2_DESC', icon: Droplet },
  {
    titleKey: 'DEMO.WATER_STEP_3_TITLE',
    descriptionKey: 'DEMO.WATER_STEP_3_DESC',
    icon: TrendingUp,
  },
  { titleKey: 'DEMO.WATER_STEP_4_TITLE', descriptionKey: 'DEMO.WATER_STEP_4_DESC', icon: Download },
];

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    selector: 'app-consumption-chart',
    titleKey: 'DEMO.TOUR_WATER_CHART_TITLE',
    descriptionKey: 'DEMO.TOUR_WATER_CHART_DESC',
  },
  {
    selector: 'app-comparison-note',
    titleKey: 'DEMO.TOUR_WATER_COMPARISON_TITLE',
    descriptionKey: 'DEMO.TOUR_WATER_COMPARISON_DESC',
  },
  {
    selector: 'app-detailed-records',
    titleKey: 'DEMO.TOUR_WATER_RECORDS_TITLE',
    descriptionKey: 'DEMO.TOUR_WATER_RECORDS_DESC',
  },
  {
    selector: 'app-consumption-input',
    titleKey: 'DEMO.TOUR_WATER_INPUT_TITLE',
    descriptionKey: 'DEMO.TOUR_WATER_INPUT_DESC',
  },
];

export const RECORD_HELP_STEPS: HelpStep[] = [
  { titleKey: 'HOME.RECORD_HELP_STEP_1_TITLE', descriptionKey: 'HOME.RECORD_HELP_STEP_1_DESC' },
  { titleKey: 'HOME.RECORD_HELP_STEP_2_TITLE', descriptionKey: 'HOME.RECORD_HELP_STEP_2_DESC' },
  { titleKey: 'HOME.RECORD_HELP_STEP_3_TITLE', descriptionKey: 'HOME.RECORD_HELP_STEP_3_DESC' },
  { titleKey: 'HOME.RECORD_HELP_STEP_4_TITLE', descriptionKey: 'HOME.RECORD_HELP_STEP_4_DESC' },
];

export const CHART_HELP_STEPS: HelpStep[] = [
  { titleKey: 'HOME.CHART_HELP_STEP_1_TITLE', descriptionKey: 'HOME.CHART_HELP_STEP_1_DESC' },
  { titleKey: 'HOME.CHART_HELP_STEP_2_TITLE', descriptionKey: 'HOME.CHART_HELP_STEP_2_DESC' },
  { titleKey: 'HOME.CHART_HELP_STEP_3_TITLE', descriptionKey: 'HOME.CHART_HELP_STEP_3_DESC' },
  { titleKey: 'HOME.CHART_HELP_STEP_4_TITLE', descriptionKey: 'HOME.CHART_HELP_STEP_4_DESC' },
];

export const RECORDS_LIST_HELP_STEPS: HelpStep[] = [
  { titleKey: 'HOME.RECORDS_HELP_STEP_1_TITLE', descriptionKey: 'HOME.RECORDS_HELP_STEP_1_DESC' },
  { titleKey: 'HOME.RECORDS_HELP_STEP_2_TITLE', descriptionKey: 'HOME.RECORDS_HELP_STEP_2_DESC' },
  { titleKey: 'HOME.RECORDS_HELP_STEP_3_TITLE', descriptionKey: 'HOME.RECORDS_HELP_STEP_3_DESC' },
  { titleKey: 'HOME.RECORDS_HELP_STEP_4_TITLE', descriptionKey: 'HOME.RECORDS_HELP_STEP_4_DESC' },
];
