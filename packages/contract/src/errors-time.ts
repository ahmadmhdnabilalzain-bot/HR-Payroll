/** Plan 9 error codes with their HTTP status (merged into ERROR_STATUS). */
export const TIME_ERROR_STATUS = {
  RANGE_TOO_LONG: 400,
  HOLIDAY_EXISTS: 409,
  PERIOD_OVERLAP: 409,
  WORK_SITE_REQUIRED: 422,
} as const;
