import {
  BookOpen,
  Brain,
  ChartBar,
  Cloud,
  Droplets,
  FileSpreadsheet,
  Flame,
  Globe,
  House,
  Infinity as LucideInfinity,
  Layers,
  Pencil,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  type LucideIconData,
} from 'lucide-angular';

export interface LandingHighlight {
  icon: LucideIconData;
  titleKey: string;
  descKey: string;
  tags: string[];
  themeClass: string;
  color: string;
}

export interface LandingFeature {
  icon: LucideIconData;
  titleKey: string;
  descKey: string;
  color: string;
}

export interface LandingStat {
  value: string;
  labelKey: string;
  icon: LucideIconData;
}

export interface SceneryItem {
  top: number;
  left: number;
  delay: number;
  type: 'tree' | 'house';
  icon: string;
  style?: string;
}

export interface FloatingBadge {
  icon: LucideIconData;
  top: string;
  left: string;
  right?: string;
  delay: string;
  size: string;
  color: string;
  style: string;
}

export interface HowStep {
  badge: string;
  iconClass: string;
  icon: LucideIconData;
  titleKey: string;
  descKey: string;
}

export const HIGHLIGHT_KEYS: LandingHighlight[] = [
  {
    icon: ShieldCheck,
    titleKey: 'LANDING.HIGHLIGHTS.LOCAL_TITLE',
    descKey: 'LANDING.HIGHLIGHTS.LOCAL_DESC',
    tags: [
      'LANDING.HIGHLIGHTS.LOCAL_TAG_1',
      'LANDING.HIGHLIGHTS.LOCAL_TAG_2',
      'LANDING.HIGHLIGHTS.LOCAL_TAG_3',
    ],
    themeClass: 'highlight--local',
    color: '#10b981',
  },
  {
    icon: Brain,
    titleKey: 'LANDING.HIGHLIGHTS.PREDICT_TITLE',
    descKey: 'LANDING.HIGHLIGHTS.PREDICT_DESC',
    tags: [
      'LANDING.HIGHLIGHTS.PREDICT_TAG_1',
      'LANDING.HIGHLIGHTS.PREDICT_TAG_2',
      'LANDING.HIGHLIGHTS.PREDICT_TAG_3',
    ],
    themeClass: 'highlight--predict',
    color: '#a855f7',
  },
  {
    icon: Layers,
    titleKey: 'LANDING.HIGHLIGHTS.UNIFIED_TITLE',
    descKey: 'LANDING.HIGHLIGHTS.UNIFIED_DESC',
    tags: [
      'LANDING.HIGHLIGHTS.UNIFIED_TAG_1',
      'LANDING.HIGHLIGHTS.UNIFIED_TAG_2',
      'LANDING.HIGHLIGHTS.UNIFIED_TAG_3',
    ],
    themeClass: 'highlight--unified',
    color: '#0284c7',
  },
  {
    icon: Globe,
    titleKey: 'LANDING.HIGHLIGHTS.PRIVACY_TITLE',
    descKey: 'LANDING.HIGHLIGHTS.PRIVACY_DESC',
    tags: [
      'LANDING.HIGHLIGHTS.PRIVACY_TAG_1',
      'LANDING.HIGHLIGHTS.PRIVACY_TAG_2',
      'LANDING.HIGHLIGHTS.PRIVACY_TAG_3',
    ],
    themeClass: 'highlight--privacy',
    color: '#f43f5e',
  },
];

export const FEATURE_KEYS: LandingFeature[] = [
  {
    icon: Droplets,
    titleKey: 'LANDING.FEATURES.WATER_TITLE',
    descKey: 'LANDING.FEATURES.WATER_DESC',
    color: '#3b82f6',
  },
  {
    icon: Flame,
    titleKey: 'LANDING.FEATURES.HEATING_TITLE',
    descKey: 'LANDING.FEATURES.HEATING_DESC',
    color: '#f59e0b',
  },
  {
    icon: Zap,
    titleKey: 'LANDING.FEATURES.ELECTRICITY_TITLE',
    descKey: 'LANDING.FEATURES.ELECTRICITY_DESC',
    color: '#8b5cf6',
  },
  {
    icon: Users,
    titleKey: 'LANDING.FEATURES.FAMILY_TITLE',
    descKey: 'LANDING.FEATURES.FAMILY_DESC',
    color: '#10b981',
  },
  {
    icon: ChartBar,
    titleKey: 'LANDING.FEATURES.ANALYTICS_TITLE',
    descKey: 'LANDING.FEATURES.ANALYTICS_DESC',
    color: '#ec4899',
  },
  {
    icon: Brain,
    titleKey: 'LANDING.FEATURES.PREDICTIONS_TITLE',
    descKey: 'LANDING.FEATURES.PREDICTIONS_DESC',
    color: '#a855f7',
  },
  {
    icon: Globe,
    titleKey: 'LANDING.FEATURES.COUNTRY_TITLE',
    descKey: 'LANDING.FEATURES.COUNTRY_DESC',
    color: '#f97316',
  },
  {
    icon: Cloud,
    titleKey: 'LANDING.FEATURES.CLOUD_TITLE',
    descKey: 'LANDING.FEATURES.CLOUD_DESC',
    color: '#06b6d4',
  },
  {
    icon: FileSpreadsheet,
    titleKey: 'LANDING.FEATURES.EXPORT_TITLE',
    descKey: 'LANDING.FEATURES.EXPORT_DESC',
    color: '#14b8a6',
  },
];

export const STAT_KEYS: LandingStat[] = [
  { value: '100%', labelKey: 'LANDING.STATS.FREE', icon: Sparkles },
  { value: '3', labelKey: 'LANDING.STATS.TRACKERS', icon: Layers },
  { value: '∞', labelKey: 'LANDING.STATS.DATA_POINTS', icon: LucideInfinity },
  { value: '0', labelKey: 'LANDING.STATS.ADS', icon: ShieldCheck },
];

export const LEFT_SCENERY: SceneryItem[] = [
  { top: 8, left: 28, delay: 0.1, type: 'tree', icon: '🌳' },
  { top: 16, left: 24, delay: 0.15, type: 'house', icon: '🏡' },
  { top: 24, left: 28, delay: 0.2, type: 'tree', icon: '🌲' },
  { top: 34, left: 34, delay: 0.25, type: 'tree', icon: '🌳' },
  { top: 44, left: 38, delay: 0.3, type: 'house', icon: '🏠' },
  { top: 52, left: 34, delay: 0.35, type: 'tree', icon: '🌲' },
  { top: 62, left: 28, delay: 0.4, type: 'tree', icon: '🌳' },
  { top: 72, left: 24, delay: 0.45, type: 'house', icon: '🏡' },
  { top: 82, left: 28, delay: 0.5, type: 'tree', icon: '🌲' },
  { top: 92, left: 32, delay: 0.55, type: 'tree', icon: '🌳' },
];

export const RIGHT_SCENERY: SceneryItem[] = [
  { top: 10, left: 62, delay: 0.12, type: 'tree', icon: '🌲' },
  { top: 20, left: 64, delay: 0.18, type: 'house', icon: '🏘️' },
  { top: 30, left: 66, delay: 0.24, type: 'tree', icon: '🌳' },
  { top: 40, left: 72, delay: 0.3, type: 'house', icon: '🏠' },
  { top: 48, left: 74, delay: 0.36, type: 'tree', icon: '🌲' },
  { top: 58, left: 70, delay: 0.42, type: 'tree', icon: '🌳' },
  { top: 66, left: 64, delay: 0.48, type: 'house', icon: '🏡' },
  { top: 76, left: 60, delay: 0.54, type: 'tree', icon: '🌲' },
  { top: 86, left: 64, delay: 0.6, type: 'tree', icon: '🌳' },
  { top: 94, left: 66, delay: 0.66, type: 'house', icon: '🏠' },
];

export const ALL_SCENERY: SceneryItem[] = [...LEFT_SCENERY, ...RIGHT_SCENERY].map((item) => ({
  ...item,
  style: `top:${item.top}%;left:${item.left}%;transition-delay:${item.delay}s`,
}));

export const FLOATING_BADGES: FloatingBadge[] = [
  {
    icon: Droplets,
    top: '16%',
    left: '8%',
    delay: '0s',
    size: '20',
    color: '#3b82f6',
    style: 'top:16%;left:8%;right:auto;animation-delay:0s;--badge-color:#3b82f6',
  },
  {
    icon: Flame,
    top: '24%',
    left: 'auto',
    right: '10%',
    delay: '-4s',
    size: '18',
    color: '#f59e0b',
    style: 'top:24%;left:auto;right:10%;animation-delay:-4s;--badge-color:#f59e0b',
  },
  {
    icon: Zap,
    top: '62%',
    left: '10%',
    delay: '-8s',
    size: '18',
    color: '#8b5cf6',
    style: 'top:62%;left:10%;right:auto;animation-delay:-8s;--badge-color:#8b5cf6',
  },
  {
    icon: ChartBar,
    top: '72%',
    left: 'auto',
    right: '8%',
    delay: '-12s',
    size: '18',
    color: '#ec4899',
    style: 'top:72%;left:auto;right:8%;animation-delay:-12s;--badge-color:#ec4899',
  },
  {
    icon: House,
    top: '44%',
    left: 'auto',
    right: '18%',
    delay: '-16s',
    size: '22',
    color: '#10b981',
    style: 'top:44%;left:auto;right:18%;animation-delay:-16s;--badge-color:#10b981',
  },
];

export const HOW_STEPS: HowStep[] = [
  {
    badge: '01',
    iconClass: 'step-icon-1',
    icon: BookOpen,
    titleKey: 'LANDING.HOW.STEP_1_TITLE',
    descKey: 'LANDING.HOW.STEP_1_DESC',
  },
  {
    badge: '02',
    iconClass: 'step-icon-2',
    icon: Pencil,
    titleKey: 'LANDING.HOW.STEP_2_TITLE',
    descKey: 'LANDING.HOW.STEP_2_DESC',
  },
  {
    badge: '03',
    iconClass: 'step-icon-3',
    icon: TrendingUp,
    titleKey: 'LANDING.HOW.STEP_3_TITLE',
    descKey: 'LANDING.HOW.STEP_3_DESC',
  },
];

export const HERO_ROAD_PATH = 'M100,0 C60,200 140,300 100,500 C60,700 140,800 100,800';
export const PAGE_ROAD_PATH =
  'M100,0 C60,100 140,200 100,300 C60,400 140,500 100,600 C60,700 140,800 100,900 C80,950 120,1000 100,1000';

export { FAQ_KEYS, type LandingFaqItem } from '../models/seo.model';
