import { DemoWizardStep } from '../shared/demo-wizard/demo-wizard.component';
import { DemoTourStep } from '../shared/demo-tour/demo-tour.component';
import { MapPin, Users, FileSpreadsheet, HardDrive } from 'lucide-angular';

export const DEMO_WIZARD_STEPS: DemoWizardStep[] = [
  {
    titleKey: 'DEMO.SETTINGS_STEP_1_TITLE',
    descriptionKey: 'DEMO.SETTINGS_STEP_1_DESC',
    icon: MapPin,
  },
  {
    titleKey: 'DEMO.SETTINGS_STEP_2_TITLE',
    descriptionKey: 'DEMO.SETTINGS_STEP_2_DESC',
    icon: Users,
  },
  {
    titleKey: 'DEMO.SETTINGS_STEP_3_TITLE',
    descriptionKey: 'DEMO.SETTINGS_STEP_3_DESC',
    icon: FileSpreadsheet,
  },
  {
    titleKey: 'DEMO.SETTINGS_STEP_4_TITLE',
    descriptionKey: 'DEMO.SETTINGS_STEP_4_DESC',
    icon: HardDrive,
  },
];

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    selector: 'app-storage-settings',
    titleKey: 'DEMO.TOUR_SETTINGS_STORAGE_TITLE',
    descriptionKey: 'DEMO.TOUR_SETTINGS_STORAGE_DESC',
  },
  {
    selector: 'app-address',
    titleKey: 'DEMO.TOUR_SETTINGS_ADDRESS_TITLE',
    descriptionKey: 'DEMO.TOUR_SETTINGS_ADDRESS_DESC',
  },
  {
    selector: 'app-family',
    titleKey: 'DEMO.TOUR_SETTINGS_FAMILY_TITLE',
    descriptionKey: 'DEMO.TOUR_SETTINGS_FAMILY_DESC',
  },
  {
    selector: 'app-excel-settings',
    titleKey: 'DEMO.TOUR_SETTINGS_EXCEL_TITLE',
    descriptionKey: 'DEMO.TOUR_SETTINGS_EXCEL_DESC',
  },
];
