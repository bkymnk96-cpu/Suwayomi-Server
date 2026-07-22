const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const emojis = require('./emojis');

function zeusOk(text) { return `${emojis.circlecheck} ${text}`; }
function zeusNo(text) { return `${emojis.circlex} ${text}`; }
function getSupportRoleId(ticket, settings) { return ticket?.supportRoleId || ticket?.Support || settings?.staff_role || null; }
function getOwnerId(ticket) { return ticket?.ownerId || ticket?.author || ticket?.userId || null; }
function canManageTicket(member, ticket, settings = null) {
  const roleId = getSupportRoleId(ticket, settings);
  return Boolean(member?.permissions?.has(PermissionsBitField.Flags.Administrator) || (roleId && member?.roles?.cache?.has(roleId)));
}
function canCloseTicket(member, user, ticket, settings = null) { return canManageTicket(member, ticket, settings) || getOwnerId(ticket) === user?.id; }
function getNextTicketId(guildId) {
  const tickets = db.getTickets?.(guildId) || [];
  const max = tickets.reduce((n, t) => Math.max(n, Number(t.ticketId || String(t.channelId || '').slice(-4)) || 0), 0);
  return max + 1;
}
function formatTicketId(id) { return String(id || 1).padStart(3, '0'); }
function buildTicketChannelName(id) { return `ticket-${formatTicketId(id)}`; }
function createTicketMetadata({ ticketId, ownerId, supportRoleId, category, channelId, guildId, reason = null }) {
  return { ticketId, ownerId, author: ownerId, userId: ownerId, supportRoleId, Support: supportRoleId, category, channelId, guildId, reason, status: 'open', createdAt: new Date().toISOString(), claimedBy: null, closedAt: null, closedBy: null };
}
function normalizeTicketMetadata(ticket, channel = null) {
  if (!ticket) return null;
  return { ...ticket, ownerId: getOwnerId(ticket), userId: getOwnerId(ticket), supportRoleId: getSupportRoleId(ticket), Support: getSupportRoleId(ticket), channelId: ticket.channelId || channel?.id, category: ticket.category || ticket.Category || channel?.parentId };
}
function ticketEmbed(title, description, color = 0xD4AF37) { return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp(); }
function buildCloseLogEmbed({ ticket, channel, closedByUser }) {
  const t = normalizeTicketMetadata(ticket, channel) || {};
  return new EmbedBuilder().setColor(0xED4245).setTitle(`${emojis.lock} تذكرة مغلقة`).addFields(
    { name: `${emojis.ticket} التذكرة`, value: channel ? `${channel}` : (t.channelId ? `<#${t.channelId}>` : 'غير معروف'), inline: true },
    { name: `${emojis.user} صاحب التذكرة`, value: t.ownerId ? `<@${t.ownerId}>` : 'غير معروف', inline: true },
    { name: `${emojis.shieldcheck} أغلق بواسطة`, value: closedByUser ? `${closedByUser}` : 'غير معروف', inline: true },
    { name: `${emojis.clock} وقت الإنشاء`, value: t.createdAt ? `<t:${Math.floor(new Date(t.createdAt).getTime() / 1000)}:R>` : 'غير معروف', inline: true },
    { name: `${emojis.crown} المستلم`, value: t.claimedBy ? `<@${t.claimedBy}>` : 'لم يتم الاستلام', inline: true }
  ).setFooter({ text: closedByUser?.tag || 'ZEUS Tickets', iconURL: closedByUser?.displayAvatarURL?.() });
}
async function sendTicketCloseLog(guild, ticket, channel, user) {
  const settings = db.getTicketSettings(guild.id);
  const logId = settings.log_channel || settings.LogsRoom;
  const logChannel = guild.channels.cache.get(logId);
  if (!logChannel) return false;
  await logChannel.send({ embeds: [buildCloseLogEmbed({ ticket, channel, closedByUser: user })] }).catch(() => null);
  return true;
}
module.exports = { zeusOk, zeusNo, getSupportRoleId, getOwnerId, canManageTicket, canCloseTicket, getNextTicketId, formatTicketId, buildTicketChannelName, createTicketMetadata, normalizeTicketMetadata, ticketEmbed, buildCloseLogEmbed, sendTicketCloseLog };
