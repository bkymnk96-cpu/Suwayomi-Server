const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const emojis = require('../../utils/emojis');
const { success, error } = require('../../utils/embeds');

function pointsEmbed(interaction, member, profile, logs) {
  const history = logs.slice(0, 5).map(l => `${l.amount >= 0 ? emojis.circlecheck : emojis.circlex} **${l.amount >= 0 ? '+' : ''}${l.amount}** • <@${l.moderatorId}> • ${l.reason}`).join('\n') || `${emojis.infocircle} لا يوجد سجل حتى الآن`;
  return new EmbedBuilder()
    .setColor(0xD4AF37)
    .setTitle(`${emojis.crown} ملف الإداري: ${member.user.tag}`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: `${emojis.star} النقاط الحالية`, value: `**${profile.points || 0}** نقطة`, inline: true },
      { name: `${emojis.thumbup} إجمالي المضاف`, value: `${profile.totalAdded || 0}`, inline: true },
      { name: `${emojis.thumbdown} إجمالي المخصوم`, value: `${profile.totalRemoved || 0}`, inline: true },
      { name: `${emojis.list} عدد العمليات`, value: `${profile.actions || 0}`, inline: true },
      { name: `${emojis.clock} آخر تحديث`, value: profile.updatedAt ? `<t:${Math.floor(profile.updatedAt / 1000)}:R>` : 'غير متوفر', inline: true },
      { name: `${emojis.folderopen} آخر السجل`, value: history }
    )
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setTimestamp();
}

module.exports = {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('admin-points')
    .setDescription('نظام نقاط الإدارة المتقدم')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('profile').setDescription('عرض ملف عضو إداري').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)))
    .addSubcommand(s => s.setName('add').setDescription('إضافة نقاط لعضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o => o.setName('points').setDescription('عدد النقاط').setRequired(true).setMinValue(1)).addStringOption(o => o.setName('reason').setDescription('السبب')))
    .addSubcommand(s => s.setName('remove').setDescription('خصم نقاط من عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o => o.setName('points').setDescription('عدد النقاط').setRequired(true).setMinValue(1)).addStringOption(o => o.setName('reason').setDescription('السبب')))
    .addSubcommand(s => s.setName('reset').setDescription('إعادة تعيين نقاط عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('السبب')))
    .addSubcommand(s => s.setName('top').setDescription('عرض لوحة صدارة الإدارة'))
    .addSubcommand(s => s.setName('history').setDescription('عرض سجل نقاط عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)))
    .addSubcommand(s => s.setName('settings').setDescription('ضبط نظام نقاط الإدارة').addBooleanOption(o => o.setName('enabled').setDescription('تفعيل النظام')).addIntegerOption(o => o.setName('max_points').setDescription('الحد الأقصى للنقاط').setMinValue(1)).addBooleanOption(o => o.setName('auto_rewards').setDescription('تفعيل المكافآت التلقائية'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    if (sub === 'settings') {
      const data = {};
      for (const key of ['enabled', 'auto_rewards']) { const v = interaction.options.getBoolean(key); if (v !== null) data[key] = v; }
      const max = interaction.options.getInteger('max_points'); if (max) data.max_points = max;
      const settings = db.updateAdminSystemSettings(guildId, data);
      return interaction.reply({ embeds: [success(`${emojis.settings} تم تحديث نظام الإدارة`, `الحالة: **${settings.enabled ? 'مفعل' : 'معطل'}**\nالحد الأقصى: **${settings.max_points}**\nالمكافآت: **${settings.auto_rewards ? 'مفعلة' : 'معطلة'}**`)] });
    }
    const settings = db.getAdminSystemSettings(guildId);
    if (!settings.enabled && sub !== 'settings') return interaction.reply({ embeds: [error(`${emojis.circlex} نظام الإدارة معطل حالياً`)], flags: ['Ephemeral'] });
    if (sub === 'top') {
      const rows = db.getAdminPointProfiles(guildId).slice(0, 10);
      const body = rows.map((p, i) => `**${i + 1}.** <@${p.userId}> — ${emojis.star} **${p.points || 0}**`).join('\n') || 'لا توجد بيانات بعد.';
      return interaction.reply({ embeds: [success(`${emojis.trophy} صدارة نقاط الإدارة`, body)] });
    }
    const member = interaction.options.getMember('member');
    if (!member) return interaction.reply({ embeds: [error('العضو غير موجود في السيرفر')], flags: ['Ephemeral'] });
    const reason = interaction.options.getString('reason') || 'بدون سبب';
    if (sub === 'add') db.changeAdminPoints(guildId, member.id, interaction.options.getInteger('points'), interaction.user.id, reason);
    if (sub === 'remove') db.changeAdminPoints(guildId, member.id, -interaction.options.getInteger('points'), interaction.user.id, reason);
    if (sub === 'reset') db.resetAdminPoints(guildId, member.id, interaction.user.id, reason);
    const profile = db.getAdminPointProfile(guildId, member.id);
    const logs = db.getAdminPointLogs(guildId, member.id);
    return interaction.reply({ embeds: [pointsEmbed(interaction, member, profile, logs)] });
  }
};
