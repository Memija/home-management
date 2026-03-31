// English common translations - shared across the app
export const common = {
  APP: {
    TITLE: 'Water Consumption Tracker',
    SETTINGS: 'Settings',
    BACK: 'Back to Home',
  },
  ACTIONS: {
    CLOSE: 'Close',
    CANCEL: 'Cancel',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
  },
  MENU: {
    HOME: 'Home',
    WATER: 'Water',
    HEATING: 'Heating',
    ELECTRICITY: 'Electricity',
    SETTINGS: 'Settings',
    CONTACT: 'Contact Us',
  },
  DASHBOARD: {
    TITLE: 'Home Management',
    SUBTITLE: 'Select a tracker to manage your consumption',
    WATER_TRACKER: 'Water Consumption',
    WATER_DESC: 'Track your water usage',
    HEATING_TRACKER: 'Heating Consumption',
    HEATING_DESC: 'Monitor your heating energy usage',
    ELECTRICITY_TRACKER: 'Electricity Consumption',
    ELECTRICITY_DESC: 'Track your electricity usage',
    BACK_TO_DASHBOARD: 'Back to Dashboard',
  },
  CALENDAR: {
    TODAY: 'Today',
    CLEAR: 'Clear',
  },
  FOOTER: {
    APP_NAME: 'Home Management',
    SUPPORT_PROJECT: 'Support this Project',
    RELEASE_PLAN: 'Upcoming Features',
    CONTRIBUTE: 'Contribute',
    PRIVACY_POLICY: 'Privacy Policy',
    VERSION: 'Version {{version}}',
  },
  RELEASE_PLAN: {
    TITLE: 'Upcoming Features',
    SUBTITLE: "See what's coming in our next release to make your home management even better",
    COMING_SOON: 'Coming Soon',
    NEW_FEATURE: 'New',
    ENHANCEMENT: 'Enhancement',
    SMART: 'Smart',
    FILTER_ALL: 'All',
    FEATURE_1_TITLE: 'Cold Water Only Mode',
    FEATURE_1_DESC:
      "Not everyone has a separate warm water meter. Soon you'll be able to record your total water consumption even when warm water tracking isn't available, giving you complete flexibility in how you monitor your usage.",
    FEATURE_2_TITLE: 'Full-Screen Charts',
    FEATURE_2_DESC:
      'Get a better view of your consumption data with the ability to expand charts to full screen. Perfect for detailed analysis and presentations, making it easier to spot trends and patterns in your usage.',
    FEATURE_3_TITLE: 'Smart Usage Predictions',
    FEATURE_3_DESC:
      'Let the app analyze your historical consumption data and provide intelligent predictions for future usage. Plan ahead, set better budgets, and understand your consumption patterns like never before.',
    FEATURE_4_TITLE: 'Image-Based Meter Reading',
    FEATURE_4_DESC:
      'Simply take a photo of your meter and let the app automatically recognize the numbers from the image. No more manual entry - just snap a picture and the reading is captured!',
    FEATURE_5_TITLE: 'Performance & Quality Excellence',
    FEATURE_5_DESC:
      "We're striving for perfection. Our next update aims to achieve a 100% Lighthouse score across performance, accessibility, and SEO, ensuring the smoothest and most accessible experience for everyone.",
    FEATURE_6_TITLE: 'Code Quality Excellence',
    FEATURE_6_DESC:
      'We are committed to maintaining the highest code standards. Our next release will focus on deeper SonarCloud integration and resolving all reported Sonar issues.',
    CTA_TEXT:
      'Your support helps us build these features faster. Thank you for being part of our community!',
    BACK_TO_HOME: 'Back to Home',
  },
  DEMO: {
    TITLE: 'Try Demo Mode',
    DESCRIPTION: 'Experience the app with sample data to see all features in action.',
    TRY_BUTTON: 'Try Demo',
    EXIT_BUTTON: 'Exit Demo',
    BANNER_TEXT: 'You are viewing demo data',
    LOADING: 'Loading...',
    WIZARD_TITLE: 'Explore This Page',
    WIZARD_GOT_IT: 'Got it!',
    WIZARD_BUTTON: 'Take the Tour',
    STEP: 'Step',
    // Water wizard steps (non-demo mode)
    WATER_STEP_1_TITLE: 'Interactive Charts',
    WATER_STEP_1_DESC:
      'Switch between total, detailed, by-room, and by-type chart views to analyze your water consumption from different angles.',
    WATER_STEP_2_TITLE: 'Kitchen & Bathroom Tracking',
    WATER_STEP_2_DESC:
      'Track warm and cold water separately for both kitchen and bathroom. Scroll down to the input section to see the form.',
    WATER_STEP_3_TITLE: 'Country Comparison',
    WATER_STEP_3_DESC:
      'See how your consumption compares to the national average. The comparison note updates based on your address settings.',
    WATER_STEP_4_TITLE: 'Import & Export',
    WATER_STEP_4_DESC:
      'Export your data as JSON, Excel, or PDF. You can also import data from files to migrate or back up your records.',
    // Water tour steps (in demo mode)
    TOUR_WATER_CHART_TITLE: 'Interactive Water Charts',
    TOUR_WATER_CHART_DESC:
      'Explore your consumption here. Use the buttons above to switch between "Total", "Detailed", or "By Room" views. You can also click items in the legend to hide or show specific rooms on the graph.',
    TOUR_WATER_COMPARISON_TITLE: 'National Averages',
    TOUR_WATER_COMPARISON_DESC:
      'This panel compares your usage against national averages. It helps you understand if your household is saving water or consuming more than typical homes in your region.',
    TOUR_WATER_RECORDS_TITLE: 'Your Reading History',
    TOUR_WATER_RECORDS_DESC:
      'Every reading you enter is stored here. You can easily filter by dates to find specific entries, and use the action menu to export your history or import new records.',
    TOUR_WATER_INPUT_TITLE: 'Add a New Reading',
    TOUR_WATER_INPUT_DESC:
      'Enter the numbers from your meter here. If you track cold and warm water separately, the app handles both.',

    // Heating wizard steps (non-demo mode)
    HEATING_STEP_1_TITLE: 'Room-Based Tracking',
    HEATING_STEP_1_DESC:
      'Record heating consumption per room. Each room has its own meter reading, giving you a detailed view of energy usage.',
    HEATING_STEP_2_TITLE: 'Room Configuration',
    HEATING_STEP_2_DESC:
      'Click the settings icon in the input section to add, rename, or remove rooms. Each room gets its own color on the chart.',
    HEATING_STEP_3_TITLE: 'Spike Detection',
    HEATING_STEP_3_DESC:
      'The app automatically detects when a new room starts appearing in your data and alerts you, so your charts stay accurate.',
    HEATING_STEP_4_TITLE: 'Chart Views',
    HEATING_STEP_4_DESC:
      'Switch between total heating and per-room views. Use incremental mode to see monthly changes or total mode for cumulative values.',
    // Heating tour steps (in demo mode)
    TOUR_HEATING_CHART_TITLE: 'Room-by-Room Heating',
    TOUR_HEATING_CHART_DESC:
      'Analyze energy usage for every room in your home. Click on a room name in the legend to toggle its visibility, making it easier to compare the bedroom versus the living room.',
    TOUR_HEATING_RECORDS_TITLE: 'Historical Readings',
    TOUR_HEATING_RECORDS_DESC:
      'This table lists every registered heating reading. You can easily filter by dates to find specific entries, and use the action menu to export your history or import new records.',
    TOUR_HEATING_INPUT_TITLE: 'Smart Input Form',
    TOUR_HEATING_INPUT_DESC:
      'Enter readings for all your rooms in one go. If you add or remove rooms in settings, this form will automatically update to match your household layout.',

    // Electricity wizard steps (non-demo mode)
    ELECTRICITY_STEP_1_TITLE: 'Simple kWh Tracking',
    ELECTRICITY_STEP_1_DESC:
      'Record your electricity meter reading with a single value in kWh. The app calculates consumption between readings automatically.',
    ELECTRICITY_STEP_2_TITLE: 'Visual Analysis',
    ELECTRICITY_STEP_2_DESC:
      'View your electricity usage trends with interactive charts. Compare monthly, yearly, or see the total cumulative consumption.',
    ELECTRICITY_STEP_3_TITLE: 'Meter Change Alerts',
    ELECTRICITY_STEP_3_DESC:
      'When you replace your meter, the app detects the value drop and lets you confirm the change to keep your data accurate.',
    ELECTRICITY_STEP_4_TITLE: 'Smart Text Import',
    ELECTRICITY_STEP_4_DESC:
      "Paste data from your utility provider's website and the app will automatically extract dates and values for quick import.",
    // Electricity tour steps (in demo mode)
    TOUR_ELECTRICITY_CHART_TITLE: 'Electricity Consumption',
    TOUR_ELECTRICITY_CHART_DESC:
      'Visualize your power trends over time. Switch to "Incremental" mode to see exactly how much energy was used each month, or use "Total" to see your long-term cumulative usage.',
    TOUR_ELECTRICITY_COMPARISON_TITLE: 'Household Benchmarks',
    TOUR_ELECTRICITY_COMPARISON_DESC:
      'Compare your electricity usage against typical benchmarks for homes of your size. This helps you identify if your electronics or habits are using more power than expected.',
    TOUR_ELECTRICITY_RECORDS_TITLE: 'Raw Electricity Log',
    TOUR_ELECTRICITY_RECORDS_DESC:
      'A chronological list of every meter reading. You can easily filter by dates to find specific entries, and use the action menu to export your history or import new records.',
    TOUR_ELECTRICITY_INPUT_TITLE: 'Smart Meter Features',
    TOUR_ELECTRICITY_INPUT_DESC:
      'Enter your current meter reading here. If your meter was recently replaced or reset, the app will intelligently detect the lower value and ask you to confirm the change.',

    // Settings wizard steps (non-demo mode)
    SETTINGS_STEP_1_TITLE: 'Address Setup',
    SETTINGS_STEP_1_DESC:
      'Set a household address to enable consumption comparisons against national averages on all tracker pages.',
    SETTINGS_STEP_2_TITLE: 'Family Members',
    SETTINGS_STEP_2_DESC:
      'Add your household members. This enables per-person consumption calculations on the charts.',
    SETTINGS_STEP_3_TITLE: 'Excel Integration',
    SETTINGS_STEP_3_DESC:
      'Enable Excel import and export to work with your consumption data in spreadsheets. Configure column mappings for your format.',
    SETTINGS_STEP_4_TITLE: 'Data Storage',
    SETTINGS_STEP_4_DESC:
      'Everything is stored on your device by default. Use "Export" to save a backup file, or "Sign in with Google" to securely sync your data across all your devices.',
    // Settings tour steps (in demo mode)
    TOUR_SETTINGS_STORAGE_TITLE: 'Your Data & Privacy',
    TOUR_SETTINGS_STORAGE_DESC:
      'Everything is stored on your device by default. Use "Export" to save a backup file, or "Sign in with Google" to securely sync your data across all your devices.',
    TOUR_SETTINGS_ADDRESS_TITLE: 'Location & Context',
    TOUR_SETTINGS_ADDRESS_DESC:
      'Providing an address enables consumption comparisons against national averages, ensuring more accurate charts and insights.',
    TOUR_SETTINGS_FAMILY_TITLE: 'Household Members',
    TOUR_SETTINGS_FAMILY_DESC:
      'Add everyone who lives with you. This enables the "Per Person" view on charts, allowing you to fairly compare usage even if your family grows or moves.',
    TOUR_SETTINGS_EXCEL_TITLE: 'Custom Excel Formats',
    TOUR_SETTINGS_EXCEL_DESC:
      'Map custom columns to match exports from your utility provider. This allows you to import years of historical data in seconds without manual typing.',

    // Global Tour Strings
    TOUR_SKIP: 'Skip Tour',
  },
  NOTIFICATIONS: {
    TITLE: 'Notifications',
    NO_NOTIFICATIONS: 'No notifications',
    WATER_INITIAL_TITLE: 'Get Started with Water Tracking',
    WATER_INITIAL_MESSAGE: 'Add your first meter reading to start tracking your water consumption.',
    HEATING_INITIAL_TITLE: 'Get Started with Heating Tracking',
    HEATING_INITIAL_MESSAGE:
      'Add your first meter reading to start tracking your heating consumption.',
    WATER_OVERDUE_TITLE: 'Time to Add a Meter Reading',
    WATER_OVERDUE_MESSAGE:
      'It has been {{days}} days since your last water reading. Add a new entry to keep your data up to date.',
    WATER_DUE_TITLE: 'Time for Your Water Reading',
    WATER_DUE_MESSAGE: "Based on your schedule, it's time to take a water meter reading.",
    HEATING_OVERDUE_TITLE: 'Time to Add a Heating Reading',
    HEATING_OVERDUE_MESSAGE:
      'It has been {{days}} days since your last heating reading. Add a new entry to keep your data up to date.',
    HEATING_DUE_TITLE: 'Time for Your Heating Reading',
    HEATING_DUE_MESSAGE: "Based on your schedule, it's time to take a heating meter reading.",
    ELECTRICITY_INITIAL_TITLE: 'Get Started with Electricity Tracking',
    ELECTRICITY_INITIAL_MESSAGE:
      'Add your first meter reading to start tracking your electricity consumption.',
    ELECTRICITY_OVERDUE_TITLE: 'Time to Add an Electricity Reading',
    ELECTRICITY_OVERDUE_MESSAGE:
      'It has been {{days}} days since your last electricity reading. Add a new entry to keep your data up to date.',
    ELECTRICITY_DUE_TITLE: 'Time for Your Electricity Reading',
    ELECTRICITY_DUE_MESSAGE:
      "Based on your schedule, it's time to take an electricity meter reading.",
    ADDRESS_MISSING_TITLE: 'Add Your Address',
    ADDRESS_MISSING_MESSAGE: 'Set up your household address in settings for a complete profile.',
    FAMILY_MISSING_TITLE: 'Add Family Members',
    FAMILY_MISSING_MESSAGE: 'Add household members to track per-person consumption.',
    GO_TO_TRACKER: 'Go to Tracker',
    GO_TO_SETTINGS: 'Go to Settings',
    DISMISS: 'Dismiss',
  },
  FACTS: {
    DID_YOU_KNOW: 'Did you know?',
    ELECTRICITY_FALLBACK: 'Electricity has revolutionized modern life.',
  },
  IMPORT: {
    SUCCESS_TITLE: 'Import Successful',
    JSON_SUCCESS: 'JSON data imported successfully!',
    EXCEL_SUCCESS: 'Excel data imported successfully!',
  },
  SMART_IMPORT: {
    TITLE: 'Smart Text Import',
    INSTRUCTION:
      'Copy the table content from the website and paste it here. We will extract the dates and values automatically.',
    PLACEHOLDER: 'Paste your text here... (Example: 01/01/2023   1,234 kWh)',
    FOUND: 'Records Found',
    DATE: 'Date',
    VALUE: 'Value (kWh)',
    NO_DATA_FOUND:
      'No valid data could be found in the pasted text. Please try copying a different format.',
    ANALYZE: 'Analyze Text',
    BACK: 'Back to Input',
    IMPORT_BUTTON: 'Import Records',
  },
  // Month names for date parsing in Smart Import
  // When adding a new language, include these month names for automatic date parsing
  MONTHS: {
    JANUARY: 'january',
    FEBRUARY: 'february',
    MARCH: 'march',
    APRIL: 'april',
    MAY: 'may',
    JUNE: 'june',
    JULY: 'july',
    AUGUST: 'august',
    SEPTEMBER: 'september',
    OCTOBER: 'october',
    NOVEMBER: 'november',
    DECEMBER: 'december',
  },
  SEASONS: {
    PREVIOUS: 'Previous season',
    NEXT: 'Next season',
    SPRING: {
      NAME: 'Spring',
      TAGLINE: 'Flowers blooming, allergies booming 🤧',
    },
    SUMMER: {
      NAME: 'Summer',
      TAGLINE: 'Too hot to think, perfect to drink 🥤',
    },
    AUTUMN: {
      NAME: 'Autumn',
      TAGLINE: 'Too rainy to go out, cozy inside 🌧️',
    },
    WINTER: {
      NAME: 'Winter',
      TAGLINE: 'Too cold to move, time for hot cocoa ☕',
    },
  },
};
