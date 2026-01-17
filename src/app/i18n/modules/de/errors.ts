// German error message translations
export const errors = {
  ERROR: {
    TITLE: 'Fehler',
    DETAILS: 'Fehlerdetails',
    HOW_TO_FIX: 'So beheben Sie den Fehler',
    CLOSE: 'Schließen',
    EXCEL_DATE_FIX_1: 'Stellen Sie sicher, dass Datumsangaben im Format TT.MM.JJJJ vorliegen (z.B. 14.09.2025)',
    EXCEL_DATE_FIX_2: 'Oder verwenden Sie das Format TT/MM/JJJJ (z.B. 14/09/2025)',
    EXCEL_DATE_FIX_3: 'Oder verwenden Sie das Format JJJJ-MM-TT (z.B. 2025-09-14)',
    EXCEL_COLUMN_FIX_1: 'Überprüfen Sie, ob Ihre Excel-Spaltennamen mit den in den Einstellungen konfigurierten Namen übereinstimmen',
    EXCEL_COLUMN_FIX_2: 'Gehen Sie zu Einstellungen → Excel-Integration, um die Spaltenzuordnungen anzuzeigen oder zu aktualisieren',
    EXCEL_GENERIC_FIX_1: 'Überprüfen Sie, ob Ihre Excel-Datei im .xlsx-Format vorliegt',
    EXCEL_GENERIC_FIX_2: 'Stellen Sie sicher, dass alle erforderlichen Spalten mit korrekten Datentypen vorhanden sind',
    EXCEL_NUMBER_FIX_1: 'Stellen Sie sicher, dass alle Verbrauchswerte Zahlen sind',
    EXCEL_NUMBER_FIX_2: 'Entfernen Sie Text oder Sonderzeichen aus numerischen Spalten',
    EXCEL_DUPLICATE_FIX_1: 'Entfernen Sie doppelte Datumseinträge aus Ihrer Excel-Datei',
    EXCEL_DUPLICATE_FIX_2: 'Jedes Datum sollte nur einmal in der Datei vorkommen',
    JSON_DATE_FIX_1: 'Stellen Sie sicher, dass Datumsangaben im ISO-Format vorliegen (z.B. 2025-09-14T00:00:00.000Z)',
    JSON_DATE_FIX_2: 'Oder verwenden Sie das Format JJJJ-MM-TT (z.B. 2025-09-14)',
    JSON_NUMBER_FIX_1: 'Stellen Sie sicher, dass alle Verbrauchswerte Zahlen sind',
    JSON_NUMBER_FIX_2: 'Entfernen Sie Text oder Sonderzeichen aus numerischen Feldern',
    JSON_DUPLICATE_FIX_1: 'Entfernen Sie doppelte Datumseinträge aus Ihrer JSON-Datei',
    JSON_DUPLICATE_FIX_2: 'Jedes Datum sollte nur einmal in der Datei vorkommen',
    IMPORT_MISSING_ROOMS_OBJECT: 'Datensatz ({{date}}): Fehlendes oder ungültiges \'rooms\'-Objekt',
    IMPORT_INVALID_ROOM_VALUE: 'Datensatz ({{date}}): Ungültige Zahl \'{{value}}\' für Raum \'{{room}}\'',
    IMPORT_INVALID_ROOM_TYPE: 'Datensatz ({{date}}): Ungültiger Werttyp für Raum \'{{room}}\'',
    IMPORT_MISSING_ROOM_DATA: 'Datensatz ({{date}}): Fehlende Daten für Raum \'{{room}}\'',
    IMPORT_UNKNOWN_ROOM: 'Datensatz ({{date}}): Unbekannter Raum \'{{room}}\''
  }
};
