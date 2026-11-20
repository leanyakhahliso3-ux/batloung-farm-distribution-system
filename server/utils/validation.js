const PACKAGING_SIZES = ['small', 'medium', 'large'];
const FRUIT_STATUSES = ['AVAILABLE', 'UNAVAILABLE'];
const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CREDIT'];

const toFiniteNumber = (value) => {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const isValidId = (value) => {
  const number = toFiniteNumber(value);
  return number !== null && Number.isInteger(number) && number > 0;
};

const isPackagingSize = (value) => PACKAGING_SIZES.includes(value);

const isValidFruitStatus = (value) => FRUIT_STATUSES.includes(value);

const isValidPaymentMethod = (value) => PAYMENT_METHODS.includes(value);

const isValidDateString = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const describeNumberIssue = (label, value, { min = 0, allowZero = true } = {}) => {
  const number = toFiniteNumber(value);
  if (number === null) return `${label} must be a valid number`;
  if (number < min || (!allowZero && number === 0)) {
    return allowZero ? `${label} cannot be less than ${min}` : `${label} must be greater than ${min}`;
  }
  return null;
};

module.exports = {
  PACKAGING_SIZES,
  FRUIT_STATUSES,
  PAYMENT_METHODS,
  toFiniteNumber,
  isValidId,
  isPackagingSize,
  isValidFruitStatus,
  isValidPaymentMethod,
  isValidDateString,
  describeNumberIssue,
};
