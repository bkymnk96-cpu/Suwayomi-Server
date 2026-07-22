const db = require('../database/db');

const DEFAULT_CONFIG = { enabled: false, managers: [], trackedRoles: [], logChannelId: null, notifyAtMax: true, ranks: [] };
function getConfig(guildId) { return { ...DEFAULT_CONFIG, ...(db.getAdminPointsConfig(guildId) || {}) }; }
function saveConfig(guildId, patch) { return db.updateAdminPointsConfig(guildId, { ...getConfig(guildId), ...patch }); }
function all(guildId) { return db.getAdminPoints(guildId); }
function profile(guildId, userId) { return all(guildId)[userId] || { total: 0, manual: 0, ticketsClaimed: 0, ticketsClosed: 0, bonus: 0, history: [] }; }
function setProfile(guildId, userId, next) { const points = all(guildId); points[userId] = { ...profile(guildId, userId), ...next, history: (next.history || profile(guildId, userId).history || []).slice(-50) }; db.setAdminPoints(guildId, points); return points[userId]; }
function add(guildId, userId, amount, reason = 'تعديل يدوي', actorId = 'system', type = 'manual') {
  const current = profile(guildId, userId);
  const nextTotal = Math.max(0, Number(current.total || 0) + Number(amount || 0));
  const entry = { amount: Number(amount || 0), reason, actorId, type, at: Date.now() };
  const patch = { total: nextTotal, history: [...(current.history || []), entry] };
  if (type === 'manual') patch.manual = Math.max(0, Number(current.manual || 0) + Number(amount || 0));
  if (type === 'ticketClaim') patch.ticketsClaimed = Number(current.ticketsClaimed || 0) + 1;
  if (type === 'ticketClose') patch.ticketsClosed = Number(current.ticketsClosed || 0) + 1;
  if (type === 'bonus') patch.bonus = Math.max(0, Number(current.bonus || 0) + Number(amount || 0));
  return setProfile(guildId, userId, patch);
}
function leaderboard(guildId, limit = 10) { return Object.entries(all(guildId)).map(([userId, data]) => ({ userId, ...data })).sort((a,b)=>Number(b.total||0)-Number(a.total||0)).slice(0, limit); }
function hasManager(member, config = null) { const cfg = config || getConfig(member.guild.id); return member.permissions.has('Administrator') || cfg.managers.some(id => member.roles.cache.has(id)); }
module.exports = { DEFAULT_CONFIG, getConfig, saveConfig, all, profile, setProfile, add, leaderboard, hasManager };
