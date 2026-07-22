const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../database/db');

function isStaff(member, settings) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator) || member?.permissions?.has(PermissionFlagsBits.ManageChannels) || (settings?.staff_role && member?.roles?.cache?.has(settings.staff_role)));
}

function canClose(member, user, ticket, settings) {
  return isStaff(member, settings) || ticket?.userId === user?.id;
}

function nextTicketNumber(guildId) {
  return db.nextTicketCounter(guildId);
}

function formatTicketNumber(number) {
  return String(Number(number) || number || 1).padStart(3, '0');
}

function ticketName(number) {
  return `ticket-${formatTicketNumber(number)}`;
}

function supportPanelRows(claimedBy = null) {
  const emojis = require('./emojis.json');
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close').setLabel('إغلاق').setEmoji(emojis.lock || '🔒').setStyle(ButtonStyle.Danger),
    claimedBy
      ? new ButtonBuilder().setCustomId('ticket_claimed_by').setLabel(`بواسطة ${claimedBy}`).setEmoji(emojis.circlecheck || '✅').setStyle(ButtonStyle.Success).setDisabled(true)
      : new ButtonBuilder().setCustomId('claim').setLabel('استلام').setEmoji(emojis.circlecheck || '✅').setStyle(ButtonStyle.Success),
    ...(claimedBy ? [new ButtonBuilder().setCustomId('unclaim').setLabel('إلغاء الاستلام').setEmoji(emojis.circlex || '❌').setStyle(ButtonStyle.Secondary)] : [])
  );
  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('supportPanel')
      .setPlaceholder('لوحة تحكم فريق الدعم')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('تغيير اسم التذكرة').setValue('renameTicket').setEmoji(emojis.edit || '✍️'),
        new StringSelectMenuOptionBuilder().setLabel('إضافة عضو للتذكرة').setValue('addMemberToTicket').setEmoji(emojis.userplus || '✅'),
        new StringSelectMenuOptionBuilder().setLabel('حذف عضو من التذكرة').setValue('removeMemberFromTicket').setEmoji(emojis.userx || '⛔'),
        new StringSelectMenuOptionBuilder().setLabel('تحديث اللوحة').setValue('refreshSupportPanel').setEmoji(emojis.refresh || '🔄')
      )
  );
  return [buttons, menu];
}

function closeControlRow() {
  const emojis = require('./emojis.json');
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('delete').setLabel('حذف').setEmoji(emojis.trash || '🗑️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('Open').setLabel('فتح').setEmoji(emojis.tv_unlock || '🔓').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('Tran').setLabel('نسخة نصية').setEmoji(emojis.file || '📄').setStyle(ButtonStyle.Secondary)
  );
}

function closeLogEmbed(ticket, channel, user) {
  const created = Number(ticket?.created_at || Math.floor(Date.now() / 1000)) * 1000;
  const diff = Date.now() - created;
  const mins = Math.floor(diff / 60000) % 60;
  const hrs = Math.floor(diff / 3600000) % 24;
  const days = Math.floor(diff / 86400000);
  const duration = [days && `${days} يوم`, hrs && `${hrs} ساعة`, mins && `${mins} دقيقة`].filter(Boolean).join(' و ') || 'أقل من دقيقة';
  return new EmbedBuilder()
    .setColor(0xD4AF37)
    .setTitle('{emoji:lock} سجل إغلاق تذكرة')
    .addFields(
      { name: 'رقم التذكرة', value: `\`${formatTicketNumber(ticket?.ticketId)}\``, inline: true },
      { name: 'صاحب التذكرة', value: ticket?.userId ? `<@${ticket.userId}>` : 'غير معروف', inline: true },
      { name: 'أغلق بواسطة', value: `${user}`, inline: true },
      { name: 'استلمها', value: ticket?.claimedBy ? `<@${ticket.claimedBy}>` : 'لم يتم الاستلام', inline: true },
      { name: 'المدة', value: duration, inline: true },
      { name: 'القناة', value: channel?.name || 'غير معروف', inline: true }
    )
    .setTimestamp();
}

module.exports = { isStaff, canClose, nextTicketNumber, formatTicketNumber, ticketName, supportPanelRows, closeControlRow, closeLogEmbed };
