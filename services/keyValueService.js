const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, '..', 'database', 'key-value-store.json');
let store = null;

function loadStore() {
  if (store) return store;
  try {
    store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch {
    store = {};
  }
  return store;
}

function saveStore() {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function ns(namespace) {
  const data = loadStore();
  data[namespace] ||= {};
  return data[namespace];
}

function clone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

async function get(namespace, key) {
  return clone(ns(namespace)[key]);
}

async function set(namespace, key, value) {
  ns(namespace)[key] = clone(value);
  saveStore();
  return value;
}

async function del(namespace, key) {
  delete ns(namespace)[key];
  saveStore();
  return true;
}

async function has(namespace, key) {
  return Object.prototype.hasOwnProperty.call(ns(namespace), key);
}

async function push(namespace, key, value) {
  const current = (await get(namespace, key)) || [];
  if (!Array.isArray(current)) throw new Error(`لا يمكن إضافة قيمة إلى مفتاح ليس مصفوفة: ${key}`);
  current.push(value);
  await set(namespace, key, current);
  return current;
}

function clearCache() {}

module.exports = { get, set, delete: del, has, push, clearCache };
