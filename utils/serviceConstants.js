/**
 * Service Category Constants
 * These values must match exactly (case-sensitive) with frontend constants
 */

const SERVICE_CATEGORIES = [
  'Water Leakage Repair',
  'AC Gas Refilling',
  'AC Foam Wash',
  'AC Jet Wash Service',
  'AC Repair Inspection',
  'Split AC Installation'
];

/**
 * Validate if a category is valid
 * @param {string} category - Category to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidCategory = (category) => {
  return SERVICE_CATEGORIES.includes(category);
};

/**
 * Get error message for invalid category
 * @returns {string} - Error message with all valid categories
 */
const getCategoryErrorMessage = () => {
  return `Invalid category. Must be one of: ${SERVICE_CATEGORIES.join(', ')}`;
};

module.exports = {
  SERVICE_CATEGORIES,
  isValidCategory,
  getCategoryErrorMessage
};

