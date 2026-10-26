const test = require('node:test');
const assert = require('node:assert/strict');
const { formatM2REPSPost, isDuplicatePost } = require('../index');

test('M2REPS post formatting follows standard pattern', () => {
  const formatted = formatM2REPSPost('T-shirt Nike', '20', 'https://hacoo.com/item/123');
  assert.strictEqual(
    formatted,
    '🛍️ T-SHIRT NIKE 🤩‼️\n\n-20% coupon : M2REPS 🎁\n\n👉🏼 https://hacoo.com/item/123'
  );
});

test('M2REPS post formatting handles missing discount with default', () => {
  const formatted = formatM2REPSPost('Casquette Adidas', null, 'https://hacoo.com/item/456');
  assert.strictEqual(
    formatted,
    '🛍️ CASQUETTE ADIDAS 🤩‼️\n\n-15% coupon : M2REPS 🎁\n\n👉🏼 https://hacoo.com/item/456'
  );
});

test('Duplicate post detection identifies exact and whitespace-varying duplicates', () => {
  const history = [
    { text: '🛍️ CHAUSSURES 🤩‼️\n\n-15% coupon : M2REPS 🎁\n\n👉🏼 https://hacoo.com/item/1' }
  ];

  const isDup1 = isDuplicatePost('🛍️ CHAUSSURES 🤩‼️\n\n-15% coupon : M2REPS 🎁\n\n👉🏼 https://hacoo.com/item/1', history);
  const isDup2 = isDuplicatePost('🛍️ CHAUSSURES 🤩‼️ \n\n -15% coupon : M2REPS 🎁 \n\n 👉🏼 https://hacoo.com/item/1 ', history);
  const isDup3 = isDuplicatePost('🛍️ PANTALON 🤩‼️\n\n-15% coupon : M2REPS 🎁\n\n👉🏼 https://hacoo.com/item/2', history);

  assert.strictEqual(isDup1, true);
  assert.strictEqual(isDup2, true);
  assert.strictEqual(isDup3, false);
});
