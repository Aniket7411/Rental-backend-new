/**
 * Money utility functions for handling monetary values
 * Ensures all monetary values are rounded to 2 decimal places
 */

/**
 * Round monetary value to 2 decimal places
 * @param {number|string} value - The value to round
 * @returns {number} Rounded value with 2 decimal places
 */
function roundMoney(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  // Convert to number if string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check if valid number
  if (isNaN(numValue)) {
    console.warn('roundMoney: Invalid number provided, returning 0:', value);
    return 0;
  }
  
  // Round to 2 decimal places using Math.round
  return Math.round(numValue * 100) / 100;
}

/**
 * Round an object's monetary fields to 2 decimal places
 * @param {Object} obj - The object to process
 * @param {string[]} fields - Array of field names to round
 * @returns {Object} New object with rounded monetary fields
 */
function roundMonetaryFields(obj, fields) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const rounded = { ...obj };
  fields.forEach(field => {
    if (rounded[field] !== undefined && rounded[field] !== null) {
      rounded[field] = roundMoney(rounded[field]);
    }
  });
  
  return rounded;
}

/**
 * Validate and round monetary value, logging a warning if rounding was needed
 * @param {number|string} value - The value to validate and round
 * @param {string} fieldName - Name of the field (for logging)
 * @returns {number} Rounded value
 */
function validateAndRoundMoney(value, fieldName = 'value') {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  
  if (isNaN(numValue)) {
    console.warn(`${fieldName}: Invalid number provided, returning 0:`, value);
    return 0;
  }
  
  // Check if value has more than 2 decimal places
  const decimalPlaces = numValue.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 2) {
    console.warn(`${fieldName}: Value has more than 2 decimal places, rounding:`, value);
  }
  
  return roundMoney(numValue);
}

module.exports = {
  roundMoney,
  roundMonetaryFields,
  validateAndRoundMoney
};

