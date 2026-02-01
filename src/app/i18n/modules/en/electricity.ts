export const electricity = {
    ELECTRICITY: {
        TITLE: 'Electricity Consumption',
        VALUE: 'Usage',
        UNIT: 'kWh',
        IMPORT_PLACEHOLDER_SKIPPED_SINGULAR: 'Skipped {{count}} record with 0 kWh usage.',
        IMPORT_PLACEHOLDER_SKIPPED_PLURAL: 'Skipped {{count}} records with 0 kWh usage.',
        JSON_IMPORT_ERROR_TITLE: 'Import Failed',
        JSON_IMPORT_ERROR: 'Could not import the JSON file. Please check the format.',
        EXCEL_IMPORT_ERROR_TITLE: 'Import Failed',
        EXCEL_IMPORT_ERROR: 'Could not import the Excel file. Please check the format.',
        PARTIAL_INPUT_ERROR: 'Please enter a value for electricity usage.',
        INCOMPLETE_INPUT_ERROR: 'Please enter a valid electricity meter reading.',
        SUCCESS_TITLE: 'Success',
        RECORD_SAVED: 'Electricity consumption record saved successfully!',
        ERROR_TITLE: 'Error',
        DELETE_CONFIRM_TITLE: 'Confirm Deletion',
        DELETE_CONFIRM_MESSAGE: 'Are you sure you want to delete this electricity record? This action cannot be undone.',
        DELETE_ALL_CONFIRM_TITLE: 'Delete All Records',
        DELETE_ALL_CONFIRM_MESSAGE_SINGULAR: 'Are you sure you want to delete this filtered record? This action cannot be undone.',
        DELETE_ALL_CONFIRM_MESSAGE_PLURAL: 'Are you sure you want to delete all {{count}} filtered records? This action cannot be undone.',
        RECORD_HELP_TITLE: 'Recording Electricity Consumption',
        RECORD_HELP_STEP_1_TITLE: 'Why Record Electricity?',
        RECORD_HELP_STEP_1_DESC: 'Tracking electricity usage helps you identify high-consumption periods, optimize your energy efficiency, and lower your bills.',
        RECORD_HELP_STEP_2_TITLE: 'Select Date',
        RECORD_HELP_STEP_2_DESC: 'Choose the date of the meter reading. Regular readings (e.g., monthly) give the best insights.',
        RECORD_HELP_STEP_3_TITLE: 'Enter Reading',
        RECORD_HELP_STEP_3_DESC: 'Enter the value from your electricity meter in kWh.',
        RECORD_HELP_STEP_4_TITLE: 'Save Record',
        RECORD_HELP_STEP_4_DESC: 'Click Save to store the record. The date field will reset to allow for quick entry of multiple records.',
        // Detailed Records Help
        RECORDS_HELP_STEP_1_TITLE: 'Filtering Records',
        RECORDS_HELP_STEP_1_DESC: 'Use the date range, year, or month filters to find specific electricity records. Click "Reset Filters" to clear all active filters and view all records.',
        RECORDS_HELP_STEP_2_TITLE: 'Sorting & Pagination',
        RECORDS_HELP_STEP_2_DESC: 'Sort records by date or usage value using the dropdown. Control how many records to display per page (5, 10, 20, or 50) and navigate using Previous/Next buttons.',
        RECORDS_HELP_STEP_3_TITLE: 'Editing & Deleting',
        RECORDS_HELP_STEP_3_DESC: 'Click the edit icon (✏️) to modify a record or the trash icon (🗑️) to delete it. You can also delete all visible filtered records at once.',
        RECORDS_HELP_STEP_4_TITLE: 'Export & Import',
        RECORDS_HELP_STEP_4_DESC: 'Export your data as JSON, Excel, or PDF files. Import previously exported JSON or Excel files to restore your electricity consumption records. Only non-zero records are imported.',
        RECORDS_HELP_STEP_5_TITLE: 'Smart Import',
        RECORDS_HELP_STEP_5_DESC: 'Use Smart Import to paste data directly from spreadsheets or text. It automatically detects dates and meter readings, letting you preview and confirm before importing.',
        FACTS: {
            LED: {
                TITLE: 'LED Lighting',
                MESSAGE: 'Switching to LED bulbs can save up to 80% of lighting energy compared to incandescent bulbs.'
            },
            STANDBY: {
                TITLE: 'Standby Power',
                MESSAGE: 'Devices in standby mode can account for up to 10% of your household electricity consumption.'
            },
            FRIDGE: {
                TITLE: 'Refrigerator Efficiency',
                MESSAGE: 'A full fridge is more efficient than an empty one, as the thermal mass keeps it cold.'
            },
            WASHING: {
                TITLE: 'Washing Machine',
                MESSAGE: 'Washing clothes at 30°C instead of 40°C or 60°C saves significant energy.'
            }
        },
        ALL_VALUES_IN_KWH: 'All values are in kWh'
    }
};
