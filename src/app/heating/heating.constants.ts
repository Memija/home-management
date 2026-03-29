import { HelpStep } from '../shared/help-modal/help-modal.component';
import { DemoWizardStep } from '../shared/demo-wizard/demo-wizard.component';
import { DemoTourStep } from '../shared/demo-tour/demo-tour.component';
import { Flame, LayoutGrid, TrendingUp, Settings } from 'lucide-angular';

export const DEMO_WIZARD_STEPS: DemoWizardStep[] = [
  {
    titleKey: 'DEMO.HEATING_STEP_1_TITLE',
    descriptionKey: 'DEMO.HEATING_STEP_1_DESC',
    icon: Flame,
  },
  {
    titleKey: 'DEMO.HEATING_STEP_2_TITLE',
    descriptionKey: 'DEMO.HEATING_STEP_2_DESC',
    icon: LayoutGrid,
  },
  {
    titleKey: 'DEMO.HEATING_STEP_3_TITLE',
    descriptionKey: 'DEMO.HEATING_STEP_3_DESC',
    icon: TrendingUp,
  },
  {
    titleKey: 'DEMO.HEATING_STEP_4_TITLE',
    descriptionKey: 'DEMO.HEATING_STEP_4_DESC',
    icon: Settings,
  },
];

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    selector: 'app-consumption-chart',
    titleKey: 'DEMO.TOUR_HEATING_CHART_TITLE',
    descriptionKey: 'DEMO.TOUR_HEATING_CHART_DESC',
  },
  {
    selector: 'app-detailed-records',
    titleKey: 'DEMO.TOUR_HEATING_RECORDS_TITLE',
    descriptionKey: 'DEMO.TOUR_HEATING_RECORDS_DESC',
  },
  {
    selector: 'app-consumption-input',
    titleKey: 'DEMO.TOUR_HEATING_INPUT_TITLE',
    descriptionKey: 'DEMO.TOUR_HEATING_INPUT_DESC',
  },
];

export const HEATING_RECORD_HELP_STEPS: HelpStep[] = [
  {
    titleKey: 'HEATING.RECORD_HELP_STEP_1_TITLE',
    descriptionKey: 'HEATING.RECORD_HELP_STEP_1_DESC',
  },
  {
    titleKey: 'HEATING.RECORD_HELP_STEP_2_TITLE',
    descriptionKey: 'HEATING.RECORD_HELP_STEP_2_DESC',
  },
  {
    titleKey: 'HEATING.RECORD_HELP_STEP_3_TITLE',
    descriptionKey: 'HEATING.RECORD_HELP_STEP_3_DESC',
  },
  {
    titleKey: 'HEATING.RECORD_HELP_STEP_4_TITLE',
    descriptionKey: 'HEATING.RECORD_HELP_STEP_4_DESC',
  },
  {
    titleKey: 'HEATING.RECORD_HELP_STEP_5_TITLE',
    descriptionKey: 'HEATING.RECORD_HELP_STEP_5_DESC',
  },
];

export const CHART_HELP_STEPS: HelpStep[] = [
  { titleKey: 'HEATING.CHART_HELP_STEP_1_TITLE', descriptionKey: 'HEATING.CHART_HELP_STEP_1_DESC' },
  { titleKey: 'HEATING.CHART_HELP_STEP_2_TITLE', descriptionKey: 'HEATING.CHART_HELP_STEP_2_DESC' },
  { titleKey: 'HEATING.CHART_HELP_STEP_3_TITLE', descriptionKey: 'HEATING.CHART_HELP_STEP_3_DESC' },
  { titleKey: 'HEATING.CHART_HELP_STEP_4_TITLE', descriptionKey: 'HEATING.CHART_HELP_STEP_4_DESC' },
];

export const RECORDS_LIST_HELP_STEPS: HelpStep[] = [
  {
    titleKey: 'HEATING.RECORDS_HELP_STEP_1_TITLE',
    descriptionKey: 'HEATING.RECORDS_HELP_STEP_1_DESC',
  },
  {
    titleKey: 'HEATING.RECORDS_HELP_STEP_2_TITLE',
    descriptionKey: 'HEATING.RECORDS_HELP_STEP_2_DESC',
  },
  {
    titleKey: 'HEATING.RECORDS_HELP_STEP_3_TITLE',
    descriptionKey: 'HEATING.RECORDS_HELP_STEP_3_DESC',
  },
  {
    titleKey: 'HEATING.RECORDS_HELP_STEP_4_TITLE',
    descriptionKey: 'HEATING.RECORDS_HELP_STEP_4_DESC',
  },
];
