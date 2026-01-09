function isValidEnum(value, validValues) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.toUpperCase().trim();
  return validValues.includes(normalized);
}

function validateEnumCaseInsensitive(validValues, errorMessage) {
  return (value) => {
    if (value === undefined || value === null) return true;
    if (!isValidEnum(value, validValues)) {
      throw new Error(errorMessage);
    }
    return true;
  };
}

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

