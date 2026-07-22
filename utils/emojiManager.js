const fs = require('fs');
const path = require('path');

const EMOJIS_PATH = path.join(__dirname, 'emojis.json');
const CUSTOM_EMOJIS_RE = /^<a?:[A-Za-z0-9_]{2,32}:\d{17,22}>$/;
const UNICODE_EMOJI_RE = /\p{Extended_Pictographic}/u;

function loadEmojiMap() {
  try {
    if (!fs.existsSync(EMOJIS_PATH)) return { __color__: 'gold' };
    return JSON.parse(fs.readFileSync(EMOJIS_PATH, 'utf8'));
  } catch (error) {
    console.error('[EmojiManager] Failed to load emojis.json:', error);
    return { __color__: 'gold' };
  }
}

function saveEmojiMap(map) {
  const ordered = Object.keys(map).sort((a, b) => {
    if (a === '__color__') return -1;
    if (b === '__color__') return 1;
    return a.localeCompare(b);
  }).reduce((acc, key) => {
    acc[key] = map[key];
    return acc;
  }, {});
  fs.writeFileSync(EMOJIS_PATH, `${JSON.stringify(ordered, null, 4)}\n`);
  clearEmojiRequireCache();
  return ordered;
}

function clearEmojiRequireCache() {
  delete require.cache[require.resolve('./emojis.json')];
}

function isValidEmojiValue(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return CUSTOM_EMOJIS_RE.test(trimmed) || UNICODE_EMOJI_RE.test(trimmed);
}

function getEmojiHealth(name, value) {
  if (name === '__color__') return { status: 'theme', label: 'ثيم' };
  if (CUSTOM_EMOJIS_RE.test(value)) return { status: 'custom', label: 'Discord' };
  if (UNICODE_EMOJI_RE.test(value)) return { status: 'unicode', label: 'Unicode' };
  if (/^[A-Za-z0-9_]+$/.test(value || '')) return { status: 'broken', label: 'اسم فقط' };
  return { status: 'unknown', label: 'تحقق' };
}

function listEmojiEntries() {
  const map = loadEmojiMap();
  return Object.entries(map)
    .filter(([name]) => name !== '__color__')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value, ...getEmojiHealth(name, value) }));
}

function upsertEmoji(name, value) {
  const safeName = String(name || '').trim();
  const safeValue = String(value || '').trim();
  if (!/^[A-Za-z0-9_]{2,32}$/.test(safeName)) throw new Error('اسم الإيموجي يجب أن يكون 2-32 حرفاً ويحتوي أحرف/أرقام/شرطة سفلية فقط.');
  if (!isValidEmojiValue(safeValue)) throw new Error('القيمة يجب أن تكون إيموجي Unicode أو صيغة Discord مثل <:name:id>.');
  const map = loadEmojiMap();
  map[safeName] = safeValue;
  return saveEmojiMap(map);
}

function deleteEmoji(name) {
  const safeName = String(name || '').trim();
  if (!safeName || safeName === '__color__') throw new Error('اسم إيموجي غير صالح.');
  const map = loadEmojiMap();
  delete map[safeName];
  return saveEmojiMap(map);
}

module.exports = { EMOJIS_PATH, loadEmojiMap, saveEmojiMap, listEmojiEntries, upsertEmoji, deleteEmoji, getEmojiHealth, isValidEmojiValue };
