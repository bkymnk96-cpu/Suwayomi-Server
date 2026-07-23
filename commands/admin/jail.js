const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { success, error } = require('../../utils/embeds');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jail')
    .setDescription('نظام السجن والاستدعاء')
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('إعداد نظام السجن')
        .addRoleOption(o => o.setName('jail_role').setDescription('رتبة السجن (تُعطى للمسجون)').setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('روم السجن').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addChannelOption(o => o.setName('staff_voice').setDescription('روم الاستدعاء الصوتي').addChannelTypes(ChannelType.GuildVoice).setRequired(false))
        .addRoleOption(o => o.setName('staff_role').setDescription('رتبة مسؤولي السجن (يمكنهم استخدام أوامر السجن). اتركه فارغاً للاعتماد على الأدمن فقط').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('سجن عضو')
        .addUserOption(o => o.setName('user').setDescription('العضو للسجن').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('فك سجن عضو')
        .addUserOption(o => o.setName('user').setDescription('عضو فك السجن').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('summon')
        .setDescription('استدعاء مسجون')
        .addUserOption(o => o.setName('user').setDescription('العضو للاستدعاء').setRequired(true))
    ),

  async execute(interaction) {
    const fakeArgs = interaction._args || [];
    let fakeSub = null;
    let fakeUser = null;
    let fakeReason = null;

    if (fakeArgs.length > 0 && !interaction.options.getSubcommand()) {
      const subCommands = ['add', 'remove', 'summon', 'setup'];
      const possibleSub = fakeArgs[0]?.toLowerCase();
      if (subCommands.includes(possibleSub)) {
        fakeSub = possibleSub;
        const rest = fakeArgs.slice(1);
        const mentionMatch = rest[0]?.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          fakeUser = mentionMatch[1];
          fakeReason = rest.slice(1).join(' ').trim() || null;
        } else {
          if (rest[0] && /^\d+$/.test(rest[0])) {
            fakeUser = rest[0];
            fakeReason = rest.slice(1).join(' ').trim() || null;
          }
        }
      }
    }

    const sub = interaction.options.getSubcommand() || fakeSub || '';
    const guild = interaction.guild;

    if (sub === 'setup') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        // صامت
        return;
      }

      const jailRole = interaction.options.getRole('jail_role');
      const channel = interaction.options.getChannel('channel');
      const staffVoice = interaction.options.getChannel('staff_voice');
      const staffRole = interaction.options.getRole('staff_role');

      if (!jailRole || !channel) {
        return interaction.reply({ embeds: [error('الرجاء تحديد رتبة السجن والروم بشكل صحيح.')], flags: ['Ephemeral'] });
      }

      db.setJailSettings(
        guild.id,
        jailRole.id,
        channel.id,
        staffVoice ? staffVoice.id : null,
        staffRole ? staffRole.id : null
      );

      try {
        const channels = await guild.channels.fetch();
        const jailChannelId = channel.id;

        for (const [, ch] of channels) {
          if (ch.id === jailChannelId) {
            await ch.permissionOverwrites.edit(jailRole.id, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            }).catch(() => null);
          } else {
            await ch.permissionOverwrites.edit(jailRole.id, {
              ViewChannel: false,
              SendMessages: false,
              Connect: false,
              ReadMessageHistory: false
            }).catch(() => null);
          }
        }
      } catch (permErr) {
        console.error('Failed to set jail role permissions on channels:', permErr);
      }

      return interaction.reply({
        embeds: [success(`تم إعداد نظام السجن بنجاح\n\n**رتبة السجن** <@&${jailRole.id}>\n**روم السجن** <#${channel.id}>\n**روم الاستدعاء** ${staffVoice ? `<#${staffVoice.id}>` : 'غير محدد'}\n**رتبة مسؤولي السجن** ${staffRole ? `<@&${staffRole.id}>` : 'غير محددة (المديرين فقط)'}`)]
      });
    }

    const settings = db.getJailSettings(guild.id);
    if (!settings || !settings.jailRoleId || !settings.jailChannelId) {
      // صامت
      return;
    }

    const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const hasStaffRole = settings.staffRoleId && interaction.member.roles.cache.has(settings.staffRoleId);
    if (!hasAdmin && !hasStaffRole) {
      // صامت
      return;
    }

    const executorIsJailed = db.getJailedUser(interaction.user.id, guild.id) || interaction.member.roles.cache.has(settings.jailRoleId);
    if (executorIsJailed) {
      // صامت
      return;
    }

    let targetUserId = interaction.options.getUser('user')?.id || fakeUser;
    if (!targetUserId) {
      return interaction.reply({ embeds: [error('يرجى تحديد العضو المطلوب.')], flags: ['Ephemeral'] });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ embeds: [error('العضو غير موجود في السيرفر')], flags: ['Ephemeral'] });
    }

    if (sub === 'add') {
      if (targetMember.id === interaction.user.id) {
        return interaction.reply({ embeds: [error('لا يمكنك سجن نفسك')], flags: ['Ephemeral'] });
      }

      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== guild.ownerId) {
        return interaction.reply({ embeds: [error('لا تملك الصلاحية لسجن هذا العضو بسبب رتبته')], flags: ['Ephemeral'] });
      }

      const isJailed = db.getJailedUser(targetMember.id, guild.id);
      if (isJailed || targetMember.roles.cache.has(settings.jailRoleId)) {
        return interaction.reply({ embeds: [error('هذا العضو مسجون بالفعل')], flags: ['Ephemeral'] });
      }

      const reason = interaction.options.getString('reason') || fakeReason || 'لا يوجد سبب';
      const originalRoles = targetMember.roles.cache.filter(r => r.id !== guild.id).map(r => r.id);

      db.addJailedUser(targetMember.id, guild.id, JSON.stringify(originalRoles));

      try {
        await targetMember.roles.set([settings.jailRoleId], reason);
      } catch (err) {
        db.removeJailedUser(targetMember.id, guild.id);
        return interaction.reply({ embeds: [error('فشل في إزالة رتب العضو أو إعطائه رتبة السجن تأكد من صلاحيات البوت وترتيب رتبته')], flags: ['Ephemeral'] });
      }

      const jailChannel = guild.channels.cache.get(settings.jailChannelId);
      if (jailChannel) {
        jailChannel.send({
          content: `<@${targetMember.id}>`,
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setTitle('{emoji:lock} تم دخولك السجن')
              .setDescription(`لقد تم سجنك بواسطة <@${interaction.user.id}>\n**السبب** ${reason}`)
              .setTimestamp()
          ]
        }).catch(() => null);
      }

      return interaction.reply({ embeds: [success(`تم سجن العضو <@${targetMember.id}> بنجاح`)] });
    }

    if (sub === 'remove') {
      const jailedData = db.getJailedUser(targetMember.id, guild.id);
      if (!jailedData && !targetMember.roles.cache.has(settings.jailRoleId)) {
        return interaction.reply({ embeds: [error('هذا العضو ليس مسجوناً')], flags: ['Ephemeral'] });
      }

      let rolesToRestore = [];
      if (jailedData && jailedData.oldRoles) {
        try {
          rolesToRestore = JSON.parse(jailedData.oldRoles);
        } catch (e) {}
      }

      try {
        await targetMember.roles.set(rolesToRestore);
      } catch (err) {
        await targetMember.roles.remove(settings.jailRoleId).catch(() => null);
      }

      try {
        const channels = await guild.channels.fetch();
        const removalPromises = channels.map(channel =>
          channel.permissionOverwrites.delete(targetMember.id).catch(() => null)
        );
        await Promise.all(removalPromises);
      } catch (permErr) {
        console.error('Failed to remove channel permissions for unjailed user:', permErr);
      }

      db.removeJailedUser(targetMember.id, guild.id);
      return interaction.reply({ embeds: [success(`تم فك سجن العضو <@${targetMember.id}> بنجاح وإعادة رتبه`)] });
    }

    if (sub === 'summon') {
      const jailedData = db.getJailedUser(targetMember.id, guild.id);
      if (!jailedData && !targetMember.roles.cache.has(settings.jailRoleId)) {
        return interaction.reply({ embeds: [error('هذا العضو ليس مسجوناً لاستدعائه')], flags: ['Ephemeral'] });
      }

      const jailChannel = guild.channels.cache.get(settings.jailChannelId);
      if (jailChannel) {
        jailChannel.send({
          content: `<@${targetMember.id}>`,
          embeds: [
            new EmbedBuilder()
              .setColor('#57F287')
              .setTitle('{emoji:bellringing} استدعاء من الإدارة')
              .setDescription(`تم استدعاؤك بواسطة الإداري <@${interaction.user.id}>\nيرجى التجاوب فوراً`)
              .setTimestamp()
          ]
        }).catch(() => null);
      }

      if (targetMember.voice.channel) {
        if (settings.staffVoiceId) {
          const staffVC = guild.channels.cache.get(settings.staffVoiceId);
          if (staffVC) {
            await targetMember.voice.setChannel(staffVC).catch(() => null);
          }
        }
      }

      return interaction.reply({ embeds: [success(`تم استدعاء العضو <@${targetMember.id}> وإرسال التنبيه`)] });
    }
  }
};