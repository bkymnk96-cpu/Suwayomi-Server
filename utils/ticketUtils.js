const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const keyValueService = require('../services/keyValueService');

function hasAdministrator(member) {
  return Boolean(member?.permissions?.has(PermissionsBitField.Flags.Administrator));
}

function getSupportRoleId(ticket) {
  return ticket?.Support || ticket?.supportRoleId || ticket?.support || null;
}

function getOwnerId(ticket) {
  return ticket?.ownerId || ticket?.author || ticket?.userId || null;
}

function isSupportMember(member, ticket) {
  const supportRoleId = getSupportRoleId(ticket);
  return Boolean(supportRoleId && member?.roles?.cache?.has(supportRoleId));
}

function canManageTicket(member, ticket) {
  return hasAdministrator(member) || isSupportMember(member, ticket);
}

function canCloseTicket(member, user, ticket) {
  const ownerId = getOwnerId(ticket);
  return canManageTicket(member, ticket) || Boolean(ownerId && user?.id === ownerId);
}

async function getTicketData(channelId) {
  return keyValueService.get("ticketDB", `TICKET-PANEL_${channelId}`);
}

async function updateTicketData(channelId, patch) {
  const current = (await getTicketData(channelId)) || {};
  const next = { ...current, ...patch };
  await keyValueService.set("ticketDB", `TICKET-PANEL_${channelId}`, next);
  return next;
}

async function getNextTicketId(guildId) {
  const current = Number((await keyValueService.get("ticketDB", `TicketCounter_${guildId}`)) || 0);
  const next = Number.isFinite(current) ? current + 1 : 1;
  await keyValueService.set("ticketDB", `TicketCounter_${guildId}`, next);
  return next;
}

function formatTicketId(ticketId) {
  const number = Number(ticketId);
  if (!Number.isFinite(number) || number <= 0) return String(ticketId || "غير معروف");
  return String(number).padStart(3, "0");
}

function buildTicketChannelName(ticketId) {
  return `ticket-${formatTicketId(ticketId)}`;
}

function parseTicketIdFromName(name) {
  const match = String(name || "").match(/(?:ticket-)?(\d+)/i);
  return match ? Number(match[1]) : null;
}

function createTicketMetadata({ ticketId, ownerId, supportRoleId, category, channelId, guildId }) {
  return {
    ticketId,
    ownerId,
    author: ownerId,
    claimedBy: null,
    createdAt: new Date().toISOString(),
    closedAt: null,
    closedBy: null,
    category,
    channelId,
    guildId,
    Support: supportRoleId,
    supportRoleId,
  };
}

function normalizeTicketMetadata(ticket, channel) {
  const createdAt = ticket?.createdAt
    || (channel?.createdAt ? channel.createdAt.toISOString() : null)
    || (channel?.createdTimestamp ? new Date(channel.createdTimestamp).toISOString() : null)
    || new Date().toISOString();

  return {
    ...(ticket || {}),
    ticketId: ticket?.ticketId || parseTicketIdFromName(channel?.name),
    ownerId: getOwnerId(ticket),
    author: getOwnerId(ticket),
    claimedBy: ticket?.claimedBy || ticket?.claimed || ticket?.claimedById || ticket?.claimed_by || null,
    createdAt,
    closedAt: ticket?.closedAt || null,
    closedBy: ticket?.closedBy || null,
    category: ticket?.category || ticket?.Category || channel?.parentId || null,
    channelId: ticket?.channelId || channel?.id || null,
    Support: getSupportRoleId(ticket),
    supportRoleId: getSupportRoleId(ticket),
  };
}

function formatDurationMs(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days} يوم`);
  if (hours) parts.push(`${hours} ساعة`);
  if (minutes) parts.push(`${minutes} دقيقة`);
  if (!parts.length || seconds) parts.push(`${seconds} ثانية`);
  return parts.join(" و ");
}

function mentionOrUnknown(id, fallback = "غير معروف") {
  return id ? `<@${id}>` : fallback;
}

function buildCloseLogEmbed({ ticket, channel, closedByUser }) {
  const normalized = normalizeTicketMetadata(ticket, channel);
  const closedAt = normalized.closedAt || new Date().toISOString();
  const duration = formatDurationMs(new Date(closedAt).getTime() - new Date(normalized.createdAt).getTime());
  const ticketNumber = normalized.ticketId ? formatTicketId(normalized.ticketId) : (channel?.name || "غير معروف");

  return new EmbedBuilder()
    .setColor("Red")
    .setTitle("تكت مغلق {emoji:lock}")
    .addFields(
      { name: "رقم التكت", value: `\`${ticketNumber}\``, inline: true },
      { name: "صاحب التكت", value: mentionOrUnknown(normalized.ownerId), inline: true },
      { name: "أغلق بواسطة", value: mentionOrUnknown(normalized.closedBy || closedByUser?.id), inline: true },
      { name: "استلمه", value: normalized.claimedBy ? mentionOrUnknown(normalized.claimedBy) : "لم يتم الاستلام", inline: true },
      { name: "المدة", value: duration, inline: true }
    )
    .setFooter({ text: closedByUser?.tag || "نظام التذاكر", iconURL: closedByUser?.displayAvatarURL?.() || undefined })
    .setTimestamp(new Date(closedAt));
}

async function markTicketClosed(channel, user) {
  const existing = await getTicketData(channel.id);
  const normalized = normalizeTicketMetadata(existing, channel);
  return updateTicketData(channel.id, {
    ...normalized,
    closedAt: new Date().toISOString(),
    closedBy: user.id,
  });
}

async function sendTicketCloseLog(guild, ticket, channel, user) {
  const logsRoomId = await keyValueService.get("ticketDB", `LogsRoom_${guild.id}`);
  const logChannel = guild.channels.cache.get(logsRoomId);
  if (!logChannel) return false;
  await logChannel.send({ embeds: [buildCloseLogEmbed({ ticket, channel, closedByUser: user })] });
  return true;
}

module.exports = {
  hasAdministrator,
  getSupportRoleId,
  getOwnerId,
  isSupportMember,
  canManageTicket,
  canCloseTicket,
  getTicketData,
  updateTicketData,
  getNextTicketId,
  formatTicketId,
  buildTicketChannelName,
  createTicketMetadata,
  normalizeTicketMetadata,
  formatDurationMs,
  buildCloseLogEmbed,
  markTicketClosed,
  sendTicketCloseLog,
};