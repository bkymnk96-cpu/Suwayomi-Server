const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const { success, error } = require('../../utils/embeds');

// الاختصارات الافتراضية لجميع أوامر البنك
const DEFAULT_BANK_ALIASES = [
  { shortcut: 'فلوسي', command: 'bank balance' },
  { shortcut: 'يومي', command: 'bank daily' },
  { shortcut: 'اسبوعي', command: 'bank weekly' },
  { shortcut: 'ايداع', command: 'bank deposit' },
  { shortcut: 'سحب', command: 'bank withdraw' },
  { shortcut: 'تحويل', command: 'bank transfer' },
  { shortcut: 'راتب', command: 'bank salary' },
  { shortcut: 'وظيفة', command: 'bank job' },
  { shortcut: 'قرض', command: 'bank loan' },
  { shortcut: 'سداد', command: 'bank payloan' },
  { shortcut: 'استثمار', command: 'bank invest' },
  { shortcut: 'تداول', command: 'bank trade' },
  { shortcut: 'شراء', command: 'bank buy' },
  { shortcut: 'بيع', command: 'bank sell' },
  { shortcut: 'شركات', command: 'bank companies' },
  { shortcut: 'اسعار', command: 'bank prices' },
  { shortcut: 'ممتلكات', command: 'bank assets' },
  { shortcut: 'مقامرة', command: 'bank gamble' },
  { shortcut: 'نرد', command: 'bank dice' },
  { shortcut: 'عملة', command: 'bank coinflip' },
  { shortcut: 'سلوتس', command: 'bank slots' },
  { shortcut: 'سرقة', command: 'bank rob' },
  { shortcut: 'حماية', command: 'bank protect' },
  { shortcut: 'ملف', command: 'bank profile' },
  { shortcut: 'انجازات', command: 'bank achievements' },
  { shortcut: 'الاثرياء', command: 'bank top' },
  { shortcut: 'اوامر', command: 'bank help' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alias')
    .setDescription('إدارة اختصارات الأوامر في السيرفر')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(sub => 
      sub.setName('add')
      .setDescription('إضافة اختصار جديد لأمر')
      .addStringOption(opt => opt.setName('command')
        .setDescription('اختر الأمر من القائمة أو ابحث بكتابة اسمه')
        .setRequired(true)
        .setAutocomplete(true))
      .addStringOption(opt => opt.setName('shortcut').setDescription('الاختصار (مثل باند)').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('remove')
      .setDescription('إزالة اختصار')
      .addStringOption(opt => opt.setName('shortcut')
        .setDescription('الاختصار المراد حذفه')
        .setRequired(true)
        .setAutocomplete(true))
    )
    .addSubcommand(sub => 
      sub.setName('list')
      .setDescription('عرض قائمة الاختصارات الحالية')
    )
    .addSubcommand(sub =>
      sub.setName('defaults')
      .setDescription('إضافة جميع اختصارات البنك الافتراضية دفعة واحدة (إن لم تكن موجودة)')
    )
    .addSubcommand(sub =>
      sub.setName('reset')
      .setDescription('حذف جميع الاختصارات (مع إمكانية استثناء بعضها)')
      .addStringOption(opt => opt.setName('exclude')
        .setDescription('اختصارات لا تريد حذفها (افصل بينها بفاصلة)')
        .setRequired(false))
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const sub = interaction.options.getSubcommand();

    // التعامل مع الإكمال التلقائي لخيار command في الأمر add
    if (sub === 'add' && focused.name === 'command') {
      const commandsList = [];

      for (const cmd of interaction.client.commands.values()) {
        const serialized = cmd.data.toJSON();
        const base = serialized.name;
        commandsList.push({ name: base, value: base });

        if (serialized.options) {
          for (const opt of serialized.options) {
            if (opt.type === 1) { // SUB_COMMAND
              commandsList.push({ name: `${base} ${opt.name}`, value: `${base} ${opt.name}` });
            } else if (opt.type === 2) { // SUB_COMMAND_GROUP
              if (opt.options) {
                for (const subOpt of opt.options) {
                  if (subOpt.type === 1) {
                    commandsList.push({ name: `${base} ${opt.name} ${subOpt.name}`, value: `${base} ${opt.name} ${subOpt.name}` });
                  }
                }
              }
            }
          }
        }
      }

      const searchTerm = focused.value.toLowerCase();
      const filtered = commandsList
        .filter(c => c.name.toLowerCase().includes(searchTerm))
        .slice(0, 25);

      await interaction.respond(filtered);
    }

    // التعامل مع الإكمال التلقائي لخيار shortcut في الأمر remove
    if (sub === 'remove' && focused.name === 'shortcut') {
      const guildId = interaction.guild.id;
      const aliases = db.getAliases(guildId) || [];
      const searchTerm = focused.value.toLowerCase();
      const filtered = aliases
        .filter(a => a.shortcut.toLowerCase().includes(searchTerm))
        .map(a => ({ name: a.shortcut, value: a.shortcut }))
        .slice(0, 25);

      await interaction.respond(filtered);
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const command = interaction.options.getString('command').replace(/^\//, '');
      const shortcut = interaction.options.getString('shortcut').replace(/^#/, '');

      const baseCommandName = command.trim().split(/ +/)[0].toLowerCase();
      const baseCmd = interaction.client.commands.get(baseCommandName);
      if (!baseCmd) {
        return interaction.reply({ embeds: [error(`الأمر الأساسي \`${baseCommandName}\` غير موجود.`)], flags: ['Ephemeral'] });
      }

      db.addAlias(guildId, shortcut, command);
      return interaction.reply({ embeds: [success(`تمت إضافة الاختصار بنجاح!`, `يمكنك الآن استخدام \`#${shortcut}\` لتنفيذ أمر \`${command}\``)] });
    }

    if (sub === 'remove') {
      const shortcut = interaction.options.getString('shortcut').replace(/^#/, '');
      db.removeAlias(guildId, shortcut);
      return interaction.reply({ embeds: [success(`تم حذف الاختصار \`${shortcut}\` بنجاح.`)] });
    }

    if (sub === 'list') {
      const aliases = db.getAliases(guildId);
      if (!aliases.length) {
        return interaction.reply({ embeds: [error(`لا توجد اختصارات معدة في هذا السيرفر. استخدم \`/alias defaults\` لإضافة اختصارات البنك الافتراضية.`)], flags: ['Ephemeral'] });
      }

      const listStr = aliases.map(a => `**${a.shortcut}** ➔ \`${a.command}\``).join('\n');
      return interaction.reply({ embeds: [success(`قائمة الاختصارات`, listStr)] });
    }

    if (sub === 'defaults') {
      const existingAliases = db.getAliases(guildId) || [];
      const added = [];
      const skipped = [];

      for (const def of DEFAULT_BANK_ALIASES) {
        const exists = existingAliases.some(a => a.shortcut === def.shortcut);
        if (exists) {
          skipped.push(def.shortcut);
          continue;
        }
        // التحقق من وجود الأمر الأساسي
        const baseCommandName = def.command.trim().split(/ +/)[0].toLowerCase();
        const baseCmd = interaction.client.commands.get(baseCommandName);
        if (!baseCmd) {
          continue; // تجاهل إذا لم يوجد الأمر (يفترض وجود bank)
        }
        db.addAlias(guildId, def.shortcut, def.command);
        added.push(def.shortcut);
      }

      if (added.length === 0 && skipped.length === 0) {
        return interaction.reply({ embeds: [error('لم يتم إضافة أي اختصار. تأكد من وجود أوامر البنك.')], flags: ['Ephemeral'] });
      }

      let description = `تمت إضافة **${added.length}** اختصارات افتراضية بنجاح.\n`;
      if (skipped.length > 0) {
        description += `تم تجاهل **${skipped.length}** اختصار لأنها موجودة مسبقاً (${skipped.join(', ')}).`;
      }
      return interaction.reply({ embeds: [success('الاختصارات الافتراضية', description)] });
    }

    if (sub === 'reset') {
      const allAliases = db.getAliases(guildId) || [];
      if (allAliases.length === 0) {
        return interaction.reply({ embeds: [error('لا توجد اختصارات لحذفها.')], flags: ['Ephemeral'] });
      }

      // معالجة الاستثناءات
      const excludeRaw = interaction.options.getString('exclude') || '';
      const excludeList = excludeRaw
        .split(',')
        .map(e => e.trim().replace(/^#/, ''))
        .filter(e => e !== '');

      const toDelete = allAliases.filter(a => !excludeList.includes(a.shortcut));
      const excludedShortcuts = allAliases.filter(a => excludeList.includes(a.shortcut)).map(a => a.shortcut);

      if (toDelete.length === 0) {
        return interaction.reply({ embeds: [error('كل الاختصارات الحالية ضمن الاستثناءات، لا يوجد ما يمكن حذفه.')], flags: ['Ephemeral'] });
      }

      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_reset')
            .setLabel('تأكيد الحذف')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_reset')
            .setLabel('إلغاء')
            .setStyle(ButtonStyle.Secondary),
        );

      const embed = success(
        'تأكيد حذف الاختصارات',
        `سيتم حذف **${toDelete.length}** اختصار${excludedShortcuts.length > 0 ? ` (الاستثناءات: ${excludedShortcuts.join(', ')})` : ''}. اضغط تأكيد للمتابعة.`
      );

      const reply = await interaction.reply({ embeds: [embed], components: [confirmRow], flags: ['Ephemeral'] });

      const collectorFilter = i => i.user.id === interaction.user.id;
      try {
        const confirmation = await reply.awaitMessageComponent({ filter: collectorFilter, time: 30_000 });

        if (confirmation.customId === 'confirm_reset') {
          for (const alias of toDelete) {
            db.removeAlias(guildId, alias.shortcut);
          }
          let resultMsg = `تم حذف **${toDelete.length}** اختصار بنجاح.`;
          if (excludedShortcuts.length > 0) {
            resultMsg += `\nالاختصارات المستثناة من الحذف: ${excludedShortcuts.join(', ')}.`;
          }
          await confirmation.update({ embeds: [success('تم الحذف', resultMsg)], components: [] });
        } else if (confirmation.customId === 'cancel_reset') {
          await confirmation.update({ embeds: [error('تم إلغاء عملية الحذف.')], components: [] });
        }
      } catch (e) {
        await interaction.editReply({ embeds: [error('انتهت مهلة التأكيد، لم يتم الحذف.')], components: [] });
      }
    }
  }
};