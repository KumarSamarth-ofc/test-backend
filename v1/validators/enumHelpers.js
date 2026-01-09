// Helper functions for enum validation and normalization

// Check if a value is a valid enum (case-insensitive)
function isValidEnum(value, validValues) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.toUpperCase().trim();
  return validValues.includes(normalized);
}

// Create a validator function for enum values (case-insensitive)
function validateEnumCaseInsensitive(validValues, errorMessage) {
  return (value) => {
    if (value === undefined || value === null) return true;
    if (!isValidEnum(value, validValues)) {
      throw new Error(errorMessage);
    }
    return true;
  };
}

// Normalize enum value to uppercase (returns null if invalid)
function normalizeEnum(value, validValues) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.toUpperCase().trim();
  return validValues.includes(normalized) ? normalized : null;
}

module.exports = {
  isValidEnum,
  validateEnumCaseInsensitive,
  normalizeEnum,
};
