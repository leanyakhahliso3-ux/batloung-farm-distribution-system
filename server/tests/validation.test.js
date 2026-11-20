const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toFiniteNumber,
  isValidId,
  isPackagingSize,
  isValidFruitStatus,
  isValidPaymentMethod,
  describeNumberIssue,
} = require('../utils/validation');

test('toFiniteNumber rejects empty and non-numeric values', () => {
  assert.equal(toFiniteNumber('12.5'), 12.5);
  assert.equal(toFiniteNumber('abc'), null);
  assert.equal(toFiniteNumber(''), null);
  assert.equal(toFiniteNumber(null), null);
  assert.equal(toFiniteNumber(undefined), null);
});

test('isValidId only accepts positive integers', () => {
  assert.equal(isValidId('3'), true);
  assert.equal(isValidId(3), true);
  assert.equal(isValidId('0'), false);
  assert.equal(isValidId('2.5'), false);
  assert.equal(isValidId('abc'), false);
});

test('isPackagingSize only accepts database enum values', () => {
  assert.equal(isPackagingSize('small'), true);
  assert.equal(isPackagingSize('medium'), true);
  assert.equal(isPackagingSize('large'), true);
  assert.equal(isPackagingSize('Small'), false);
  assert.equal(isPackagingSize('unknown'), false);
});

test('isValidFruitStatus only accepts database enum values', () => {
  assert.equal(isValidFruitStatus('AVAILABLE'), true);
  assert.equal(isValidFruitStatus('UNAVAILABLE'), true);
  assert.equal(isValidFruitStatus('ACTIVE'), false);
  assert.equal(isValidFruitStatus('INACTIVE'), false);
  assert.equal(isValidFruitStatus('available'), false);
});

test('isValidPaymentMethod only accepts database enum values', () => {
  assert.equal(isValidPaymentMethod('CASH'), true);
  assert.equal(isValidPaymentMethod('MOBILE_MONEY'), true);
  assert.equal(isValidPaymentMethod('CREDIT'), true);
  assert.equal(isValidPaymentMethod('CARD'), false);
});

test('describeNumberIssue catches NaN and negative values', () => {
  assert.equal(describeNumberIssue('Quantity', 'abc', { min: 0, allowZero: false }), 'Quantity must be a valid number');
  assert.equal(describeNumberIssue('Quantity', '0', { min: 0, allowZero: false }), 'Quantity must be greater than 0');
  assert.equal(describeNumberIssue('Price', '-1'), 'Price cannot be less than 0');
  assert.equal(describeNumberIssue('Price', '5'), null);
});
