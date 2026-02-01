export const electricity = {
    ELECTRICITY: {
        TITLE: 'Stromverbrauch',
        VALUE: 'Verbrauch',
        UNIT: 'kWh',
        IMPORT_PLACEHOLDER_SKIPPED_SINGULAR: '{{count}} Datensatz mit 0 kWh Verbrauch übersprungen.',
        IMPORT_PLACEHOLDER_SKIPPED_PLURAL: '{{count}} Datensätze mit 0 kWh Verbrauch übersprungen.',
        JSON_IMPORT_ERROR_TITLE: 'Import fehlgeschlagen',
        JSON_IMPORT_ERROR: 'Die JSON-Datei konnte nicht importiert werden. Bitte überprüfen Sie das Format.',
        EXCEL_IMPORT_ERROR_TITLE: 'Import fehlgeschlagen',
        EXCEL_IMPORT_ERROR: 'Die Excel-Datei konnte nicht importiert werden. Bitte überprüfen Sie das Format.',
        PARTIAL_INPUT_ERROR: 'Bitte geben Sie einen Wert für den Stromverbrauch ein.',
        INCOMPLETE_INPUT_ERROR: 'Bitte geben Sie einen gültigen Zählerstand ein.',
        SUCCESS_TITLE: 'Erfolg',
        RECORD_SAVED: 'Stromverbrauchsdatensatz erfolgreich gespeichert!',
        ERROR_TITLE: 'Fehler',
        DELETE_CONFIRM_TITLE: 'Löschen bestätigen',
        DELETE_CONFIRM_MESSAGE: 'Sind Sie sicher, dass Sie diesen Stromdatensatz löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
        DELETE_ALL_CONFIRM_TITLE: 'Alle Datensätze löschen',
        DELETE_ALL_CONFIRM_MESSAGE_SINGULAR: 'Sind Sie sicher, dass Sie diesen gefilterten Datensatz löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
        DELETE_ALL_CONFIRM_MESSAGE_PLURAL: 'Sind Sie sicher, dass Sie alle {{count}} gefilterten Datensätze löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
        RECORD_HELP_TITLE: 'Stromverbrauch erfassen',
        RECORD_HELP_STEP_1_TITLE: 'Warum Strom erfassen?',
        RECORD_HELP_STEP_1_DESC: 'Die Erfassung des Stromverbrauchs hilft Ihnen, Phasen mit hohem Verbrauch zu erkennen, Ihre Energieeffizienz zu optimieren und Kosten zu senken.',
        RECORD_HELP_STEP_2_TITLE: 'Datum wählen',
        RECORD_HELP_STEP_2_DESC: 'Wählen Sie das Datum der Zählerablesung. Regelmäßige Ablesungen (z.B. monatlich) bieten die besten Einblicke.',
        RECORD_HELP_STEP_3_TITLE: 'Zählerstand eingeben',
        RECORD_HELP_STEP_3_DESC: 'Geben Sie den Wert Ihres Stromzählers in kWh ein.',
        RECORD_HELP_STEP_4_TITLE: 'Speichern',
        RECORD_HELP_STEP_4_DESC: 'Klicken Sie auf Speichern. Das Datumsfeld wird zurückgesetzt, um die schnelle Eingabe mehrerer Datensätze zu ermöglichen.',
        // Hilfe für Detaillierte Datensätze
        RECORDS_HELP_STEP_1_TITLE: 'Datensätze filtern',
        RECORDS_HELP_STEP_1_DESC: 'Verwenden Sie die Datumsbereichs-, Jahres- oder Monatsfilter, um bestimmte Stromdatensätze zu finden. Klicken Sie auf "Filter zurücksetzen", um alle aktiven Filter zu löschen und alle Datensätze anzuzeigen.',
        RECORDS_HELP_STEP_2_TITLE: 'Sortierung & Seitennummerierung',
        RECORDS_HELP_STEP_2_DESC: 'Sortieren Sie Datensätze nach Datum oder Verbrauchswert über das Dropdown-Menü. Steuern Sie, wie viele Datensätze pro Seite angezeigt werden (5, 10, 20 oder 50) und navigieren Sie mit den Schaltflächen Zurück/Weiter.',
        RECORDS_HELP_STEP_3_TITLE: 'Bearbeiten & Löschen',
        RECORDS_HELP_STEP_3_DESC: 'Klicken Sie auf das Bearbeitungssymbol (✏️), um einen Datensatz zu ändern, oder auf das Papierkorbsymbol (🗑️), um ihn zu löschen. Sie können auch alle sichtbaren gefilterten Datensätze auf einmal löschen.',
        RECORDS_HELP_STEP_4_TITLE: 'Exportieren & Importieren',
        RECORDS_HELP_STEP_4_DESC: 'Exportieren Sie Ihre Daten als JSON-, Excel- oder PDF-Dateien. Importieren Sie zuvor exportierte JSON- oder Excel-Dateien, um Ihre Stromverbrauchsdaten wiederherzustellen. Es werden nur Datensätze mit Werten ungleich Null importiert.',
        RECORDS_HELP_STEP_5_TITLE: 'Smart Import',
        RECORDS_HELP_STEP_5_DESC: 'Verwenden Sie Smart Import, um Daten direkt aus Tabellen oder Text einzufügen. Datum und Zählerstände werden automatisch erkannt und Sie können die Daten vor dem Import prüfen und bestätigen.',
        FACTS: {
            LED: {
                TITLE: 'LED-Beleuchtung',
                MESSAGE: 'Der Wechsel zu LED-Lampen kann bis zu 80% der Beleuchtungsenergie im Vergleich zu Glühbirnen einsparen.'
            },
            STANDBY: {
                TITLE: 'Standby-Strom',
                MESSAGE: 'Geräte im Standby-Modus können bis zu 10% Ihres Haushaltsstromverbrauchs ausmachen.'
            },
            FRIDGE: {
                TITLE: 'Kühlschrank-Effizienz',
                MESSAGE: 'Ein voller Kühlschrank ist effizienter als ein leerer, da die thermische Masse ihn kalt hält.'
            },
            WASHING: {
                TITLE: 'Waschmaschine',
                MESSAGE: 'Wäsche bei 30°C statt 40°C oder 60°C zu waschen, spart erheblich Energie.'
            }
        },
        ALL_VALUES_IN_KWH: 'Alle Werte sind in kWh'
    }
};
