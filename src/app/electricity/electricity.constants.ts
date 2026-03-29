import { HelpStep } from '../shared/help-modal/help-modal.component';
import { DemoWizardStep } from '../shared/demo-wizard/demo-wizard.component';
import { DemoTourStep } from '../shared/demo-tour/demo-tour.component';
import { Zap, BarChart3, AlertTriangle, ClipboardPaste } from 'lucide-angular';

export const DEMO_WIZARD_STEPS: DemoWizardStep[] = [
  {
    titleKey: 'DEMO.ELECTRICITY_STEP_1_TITLE',
    descriptionKey: 'DEMO.ELECTRICITY_STEP_1_DESC',
    icon: Zap,
  },
  {
    titleKey: 'DEMO.ELECTRICITY_STEP_2_TITLE',
    descriptionKey: 'DEMO.ELECTRICITY_STEP_2_DESC',
    icon: BarChart3,
  },
  {
    titleKey: 'DEMO.ELECTRICITY_STEP_3_TITLE',
    descriptionKey: 'DEMO.ELECTRICITY_STEP_3_DESC',
    icon: AlertTriangle,
  },
  {
    titleKey: 'DEMO.ELECTRICITY_STEP_4_TITLE',
    descriptionKey: 'DEMO.ELECTRICITY_STEP_4_DESC',
    icon: ClipboardPaste,
  },
];

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    selector: 'app-consumption-chart',
    titleKey: 'DEMO.TOUR_ELECTRICITY_CHART_TITLE',
    descriptionKey: 'DEMO.TOUR_ELECTRICITY_CHART_DESC',
  },
  {
    selector: 'app-comparison-note',
    titleKey: 'DEMO.TOUR_ELECTRICITY_COMPARISON_TITLE',
    descriptionKey: 'DEMO.TOUR_ELECTRICITY_COMPARISON_DESC',
  },
  {
    selector: 'app-detailed-records',
    titleKey: 'DEMO.TOUR_ELECTRICITY_RECORDS_TITLE',
    descriptionKey: 'DEMO.TOUR_ELECTRICITY_RECORDS_DESC',
  },
  {
    selector: 'app-consumption-input',
    titleKey: 'DEMO.TOUR_ELECTRICITY_INPUT_TITLE',
    descriptionKey: 'DEMO.TOUR_ELECTRICITY_INPUT_DESC',
  },
];

export const RECORD_HELP_STEPS: HelpStep[] = [
  {
    titleKey: 'ELECTRICITY.RECORD_HELP_STEP_1_TITLE',
    descriptionKey: 'ELECTRICITY.RECORD_HELP_STEP_1_DESC',
  },
  {
    titleKey: 'ELECTRICITY.RECORD_HELP_STEP_2_TITLE',
    descriptionKey: 'ELECTRICITY.RECORD_HELP_STEP_2_DESC',
  },
  {
    titleKey: 'ELECTRICITY.RECORD_HELP_STEP_3_TITLE',
    descriptionKey: 'ELECTRICITY.RECORD_HELP_STEP_3_DESC',
  },
  {
    titleKey: 'ELECTRICITY.RECORD_HELP_STEP_4_TITLE',
    descriptionKey: 'ELECTRICITY.RECORD_HELP_STEP_4_DESC',
  },
];

export const CHART_HELP_STEPS: HelpStep[] = [
  {
    titleKey: 'ELECTRICITY.CHART_HELP_STEP_1_TITLE',
    descriptionKey: 'ELECTRICITY.CHART_HELP_STEP_1_DESC',
  },
  {
    titleKey: 'ELECTRICITY.CHART_HELP_STEP_2_TITLE',
    descriptionKey: 'ELECTRICITY.CHART_HELP_STEP_2_DESC',
  },
  {
    titleKey: 'ELECTRICITY.CHART_HELP_STEP_3_TITLE',
    descriptionKey: 'ELECTRICITY.CHART_HELP_STEP_3_DESC',
  },
  {
    titleKey: 'ELECTRICITY.CHART_HELP_STEP_4_TITLE',
    descriptionKey: 'ELECTRICITY.CHART_HELP_STEP_4_DESC',
  },
];

export const RECORDS_LIST_HELP_STEPS: HelpStep[] = [
  {
    titleKey: 'ELECTRICITY.RECORDS_HELP_STEP_1_TITLE',
    descriptionKey: 'ELECTRICITY.RECORDS_HELP_STEP_1_DESC',
  },
  {
    titleKey: 'ELECTRICITY.RECORDS_HELP_STEP_2_TITLE',
    descriptionKey: 'ELECTRICITY.RECORDS_HELP_STEP_2_DESC',
  },
  {
    titleKey: 'ELECTRICITY.RECORDS_HELP_STEP_3_TITLE',
    descriptionKey: 'ELECTRICITY.RECORDS_HELP_STEP_3_DESC',
  },
  {
    titleKey: 'ELECTRICITY.RECORDS_HELP_STEP_4_TITLE',
    descriptionKey: 'ELECTRICITY.RECORDS_HELP_STEP_4_DESC',
  },
  {
    titleKey: 'ELECTRICITY.RECORDS_HELP_STEP_5_TITLE',
    descriptionKey: 'ELECTRICITY.RECORDS_HELP_STEP_5_DESC',
  },
];
