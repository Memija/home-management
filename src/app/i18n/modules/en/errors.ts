// English error message translations
export const errors = {
  ERROR: {
    TITLE: 'Error',
    DETAILS: 'Error Details',
    HOW_TO_FIX: 'How to Fix',
    CLOSE: 'Close',
    EXCEL_DATE_FIX_1: 'Ensure dates are in DD.MM.YYYY format (e.g., 14.09.2025)',
    EXCEL_DATE_FIX_2: 'Or use DD/MM/YYYY format (e.g., 14/09/2025)',
    EXCEL_DATE_FIX_3: 'Or use YYYY-MM-DD format (e.g., 2025-09-14)',
    EXCEL_COLUMN_FIX_1: 'Check that your Excel column names match the configured names in Settings',
    EXCEL_COLUMN_FIX_2: 'Go to Settings → Excel Integration to view or update column mappings',
    EXCEL_GENERIC_FIX_1: 'Verify your Excel file is in .xlsx format',
    EXCEL_GENERIC_FIX_2: 'Ensure all required columns are present with correct data types',
    EXCEL_NUMBER_FIX_1: 'Ensure all consumption values are numbers',
    EXCEL_NUMBER_FIX_2: 'Remove any text or special characters from numeric columns',
    EXCEL_DUPLICATE_FIX_1: 'Remove duplicate date entries from your Excel file',
    EXCEL_DUPLICATE_FIX_2: 'Each date should only appear once in the file',
    JSON_DATE_FIX_1: 'Ensure dates are in ISO format (e.g., 2025-09-14T00:00:00.000Z)',
    JSON_DATE_FIX_2: 'Or use YYYY-MM-DD format (e.g., 2025-09-14)',
    JSON_NUMBER_FIX_1: 'Ensure all consumption values are numbers',
    JSON_NUMBER_FIX_2: 'Remove any text or special characters from numeric fields',
    JSON_DUPLICATE_FIX_1: 'Remove duplicate date entries from your JSON file',
    JSON_DUPLICATE_FIX_2: 'Each date should only appear once in the file',
    IMPORT_MISSING_ROOMS_OBJECT: 'Record ({{date}}): Missing or invalid \'rooms\' object',
    IMPORT_INVALID_ROOM_VALUE: 'Record ({{date}}): Invalid number \'{{value}}\' for room \'{{room}}\'',
    IMPORT_INVALID_ROOM_TYPE: 'Record ({{date}}): Invalid value type for room \'{{room}}\'',
    IMPORT_MISSING_ROOM_DATA: 'Record ({{date}}): Missing data for room \'{{room}}\'',
    IMPORT_UNKNOWN_ROOM: 'Record ({{date}}): Unknown room \'{{room}}\''
  }
};
