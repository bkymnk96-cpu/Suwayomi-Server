const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { success, error } = require('../../utils/embeds');

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
      .addStringOption(opt => opt.setName('shortcut').setDescription('الاختصار المراد حذفه').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('list')
      .setDescription('عرض قائمة الاختصارات الحالية')
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'command') {
      const commandsList = [];

      for (const cmd of interaction.client.commands.values()) {
        const base = cmd.data.name;
        // الأمر الأساسي
        commandsList.push({ name: base, value: base });

        // الأوامر الفرعية والمجموعات
        if (cmd.data.options) {
          for (const opt of cmd.data.options) {
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
        return interaction.reply({ embeds: [error(`لا توجد اختصارات معدة في هذا السيرفر.`)], flags: ['Ephemeral'] });
      }

      const listStr = aliases.map(a => `**${a.shortcut}** ➔ \`${a.command}\``).join('\n');
      return interaction.reply({ embeds: [success(`قائمة الاختصارات`, listStr)] });
    }
  }
};