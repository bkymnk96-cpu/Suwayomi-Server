const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');

function getPanelData(guildId) {
  const settings = db.getTicketSettings(guildId);
  return { ...(settings.panel_data || {}), ticketButtons: settings.panel_data?.ticketButtons || {}, welcomeTemplates: settings.panel_data?.welcomeTemplates || {}, selectOptions: settings.panel_data?.selectOptions || [] };
}
async function savePanelData(guildId, patch) {
  const settings = db.getTicketSettings(guildId);
  const next = { ...(settings.panel_data || {}), ...patch };
  await db.updateTicketSettings(guildId, { panel_data: next });
  return next;
}
function zeusPanelEmbed(guild, panel = {}) {
  return new EmbedBuilder()
    .setColor(panel.color || 0xD4AF37)
    .setTitle(panel.title || '{emoji:ticket} مركز تذاكر زيوس')
    .setDescription(panel.description || 'اختر نوع التذكرة أو اضغط الزر لفتح تذكرة وسيصلك فريق الدعم بأسرع وقت.')
    .setThumbnail(guild.iconURL())
    .setFooter({ text: guild.name, iconURL: guild.iconURL() })
    .setTimestamp();
}
function buildTicketComponents(panel = {}) {
  const buttons = Object.entries(panel.ticketButtons || {});
  if (panel.mode === 'select' && (panel.selectOptions || []).length) {
    return [new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder(panel.selectPlaceholder || 'اختر نوع التذكرة').addOptions(panel.selectOptions.slice(0,25).map(opt => ({ label: opt.label, value: opt.customId, description: opt.description || undefined, emoji: opt.emoji || undefined })))
    )];
  }
  const row = new ActionRowBuilder();
  if (!buttons.length) {
    row.addComponents(new ButtonBuilder().setCustomId('ticket_create_btn').setLabel(panel.buttonLabel || 'فتح تذكرة').setEmoji(panel.buttonEmoji || undefined).setStyle(ButtonStyle.Primary));
  } else {
    for (const [, cfg] of buttons.slice(0,5)) row.addComponents(new ButtonBuilder().setCustomId(cfg.customId).setLabel(cfg.label || 'فتح تذكرة').setEmoji(cfg.emoji || undefined).setStyle(ButtonStyle[cfg.style] || ButtonStyle.Primary));
  }
  return [row];
}
function resolveTicketButton(settings, customId) {
  const panel = settings.panel_data || {};
  return panel.ticketButtons?.[customId] || panel.selectOptions?.find(o => o.customId === customId) || null;
}
module.exports = { getPanelData, savePanelData, zeusPanelEmbed, buildTicketComponents, resolveTicketButton };
