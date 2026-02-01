// German common translations - shared across the app
export const common = {
  APP: {
    TITLE: 'Wasserverbrauch Tracker',
    SETTINGS: 'Einstellungen',
    BACK: 'Zurück zur Startseite'
  },
  ACTIONS: {
    CLOSE: 'Schließen',
    CANCEL: 'Abbrechen',
    SAVE: 'Speichern',
    DELETE: 'Löschen',
    EDIT: 'Bearbeiten'
  },
  MENU: {
    HOME: 'Startseite',
    WATER: 'Wasser',
    HEATING: 'Heizung',
    ELECTRICITY: 'Strom',
    SETTINGS: 'Einstellungen',
    CONTACT: 'Kontakt'
  },
  DASHBOARD: {
    TITLE: 'Haushaltsmanagement',
    SUBTITLE: 'Wählen Sie einen Tracker zur Verwaltung Ihres Verbrauchs',
    WATER_TRACKER: 'Wasserverbrauch',
    WATER_DESC: 'Verfolgen Sie Ihren Wasserverbrauch',
    HEATING_TRACKER: 'Heizungsverbrauch',
    HEATING_DESC: 'Überwachen Sie Ihren Heizenergieverbrauch',
    ELECTRICITY_TRACKER: 'Stromverbrauch',
    ELECTRICITY_DESC: 'Verfolgen Sie Ihren Stromverbrauch',
    BACK_TO_DASHBOARD: 'Zurück zum Dashboard'
  },
  CALENDAR: {
    TODAY: 'Heute',
    CLEAR: 'Löschen'
  },
  FOOTER: {
    APP_NAME: 'Haushaltsmanagement',
    ALL_RIGHTS: 'Alle Rechte vorbehalten',
    CONTACT_US: 'Kontaktiere uns'
  },
  DEMO: {
    TITLE: 'Demo-Modus ausprobieren',
    DESCRIPTION: 'Erleben Sie die App mit Beispieldaten, um alle Funktionen in Aktion zu sehen.',
    TRY_BUTTON: 'Demo starten',
    EXIT_BUTTON: 'Demo beenden',
    BANNER_TEXT: 'Sie sehen Demo-Daten',
    LOADING: 'Wird geladen...'
  },
  NOTIFICATIONS: {
    TITLE: 'Benachrichtigungen',
    NO_NOTIFICATIONS: 'Keine Benachrichtigungen',
    WATER_INITIAL_TITLE: 'Starten Sie mit der Wassererfassung',
    WATER_INITIAL_MESSAGE: 'Fügen Sie Ihren ersten Zählerstand hinzu, um Ihren Wasserverbrauch zu verfolgen.',
    HEATING_INITIAL_TITLE: 'Starten Sie mit der Heizungserfassung',
    HEATING_INITIAL_MESSAGE: 'Fügen Sie Ihren ersten Zählerstand hinzu, um Ihren Heizungsverbrauch zu verfolgen.',
    WATER_OVERDUE_TITLE: 'Zeit für einen Zählerstand',
    WATER_OVERDUE_MESSAGE: 'Es sind {{days}} Tage seit Ihrer letzten Wasserablesung vergangen. Fügen Sie einen neuen Eintrag hinzu.',
    WATER_DUE_TITLE: 'Zeit für Ihre Wasserablesung',
    WATER_DUE_MESSAGE: 'Basierend auf Ihrem Zeitplan ist es Zeit für eine Wasserablesung.',
    HEATING_OVERDUE_TITLE: 'Zeit für einen Heizungsablesen',
    HEATING_OVERDUE_MESSAGE: 'Es sind {{days}} Tage seit Ihrer letzten Heizungsablesung vergangen. Fügen Sie einen neuen Eintrag hinzu.',
    HEATING_DUE_TITLE: 'Zeit für Ihre Heizungsablesung',
    HEATING_DUE_MESSAGE: 'Basierend auf Ihrem Zeitplan ist es Zeit für eine Heizungsablesung.',
    ELECTRICITY_INITIAL_TITLE: 'Starten Sie mit der Stromerfassung',
    ELECTRICITY_INITIAL_MESSAGE: 'Fügen Sie Ihren ersten Zählerstand hinzu, um Ihren Stromverbrauch zu verfolgen.',
    ELECTRICITY_OVERDUE_TITLE: 'Zeit für einen Stromzählerstand',
    ELECTRICITY_OVERDUE_MESSAGE: 'Es sind {{days}} Tage seit Ihrer letzten Stromablesung vergangen. Fügen Sie einen neuen Eintrag hinzu.',
    ELECTRICITY_DUE_TITLE: 'Zeit für Ihre Stromablesung',
    ELECTRICITY_DUE_MESSAGE: 'Basierend auf Ihrem Zeitplan ist es Zeit für eine Stromablesung.',
    ADDRESS_MISSING_TITLE: 'Adresse hinzufügen',
    ADDRESS_MISSING_MESSAGE: 'Richten Sie Ihre Haushaltsadresse in den Einstellungen ein.',
    FAMILY_MISSING_TITLE: 'Familienmitglieder hinzufügen',
    FAMILY_MISSING_MESSAGE: 'Fügen Sie Haushaltsmitglieder hinzu, um den Pro-Kopf-Verbrauch zu verfolgen.',
    GO_TO_TRACKER: 'Zum Tracker',
    GO_TO_SETTINGS: 'Zu Einstellungen',
    DISMISS: 'Schließen'
  },
  FACTS: {
    DID_YOU_KNOW: 'Wussten Sie schon?'
  },
  IMPORT: {
    SUCCESS_TITLE: 'Import erfolgreich',
    JSON_SUCCESS: 'JSON-Daten erfolgreich importiert!',
    EXCEL_SUCCESS: 'Excel-Daten erfolgreich importiert!'
  },
  SMART_IMPORT: {
    TITLE: 'Intelligenter Textimport',
    INSTRUCTION: 'Kopieren Sie den Tabelleninhalt von der Webseite und fügen Sie ihn hier ein. Wir extrahieren die Daten und Werte automatisch.',
    PLACEHOLDER: 'Text hier einfügen... (Beispiel: 01.01.2023   1234 kWh)',
    FOUND: 'Gefundene Einträge',
    DATE: 'Datum',
    VALUE: 'Wert (kWh)',
    NO_DATA_FOUND: 'Im eingefügten Text konnten keine gültigen Daten gefunden werden. Bitte versuchen Sie, ein anderes Format zu kopieren.',
    ANALYZE: 'Text analysieren',
    BACK: 'Zurück zur Eingabe',
    IMPORT_BUTTON: 'Einträge importieren'
  },
  // Month names for date parsing in Smart Import
  // When adding a new language, include these month names for automatic date parsing
  MONTHS: {
    JANUARY: 'januar',
    FEBRUARY: 'februar',
    MARCH: 'märz',
    APRIL: 'april',
    MAY: 'mai',
    JUNE: 'juni',
    JULY: 'juli',
    AUGUST: 'august',
    SEPTEMBER: 'september',
    OCTOBER: 'oktober',
    NOVEMBER: 'november',
    DECEMBER: 'dezember'
  }
};
