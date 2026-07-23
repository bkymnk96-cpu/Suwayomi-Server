const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const locale = require('../../utils/locale');
const { success, error } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('حذف رسائل الروم')
    .addIntegerOption(o => o
      .setName('amount')
      .setDescription('عدد الرسائل المراد حذفها (اتركه فارغاً لمسح القناة بالكامل)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('حذف رسائل عضو معين فقط'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');

    if (amount) {
      // وضع تحديد عدد
      await interaction.deferReply({ flags: ['Ephemeral'] });
      let messages = await interaction.channel.messages.fetch({ limit: 100 });
      messages = messages.filter(m => !m.pinned);
      if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
      const toDelete = [...messages.values()].slice(0, amount);

      try {
        const deleted = await interaction.channel.bulkDelete(toDelete, true);
        return interaction.editReply({
          embeds: [success(locale.get('moderation.clearSuccess', { count: deleted.size }))]
        });
      } catch (e) {
        return interaction.editReply({ embeds: [error(locale.get('general.errorOccurred'))] });
      }
    }

    // مسح كامل (بدون تحديد عدد)
    await interaction.deferReply({ flags: ['Ephemeral'] });
    let totalDeleted = 0;
    const MAX_ITERATIONS = 20; // أمان لمنع الحلقة اللانهائية

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const fetched = await interaction.channel.messages.fetch({ limit: 100 });
      let toDelete = fetched.filter(m => !m.pinned);
      if (filterUser) toDelete = toDelete.filter(m => m.author.id === filterUser.id);

      if (toDelete.size === 0) break;

      const deleted = await interaction.channel.bulkDelete(toDelete, true);
      totalDeleted += deleted.size;

      if (fetched.size < 100) break; // لا مزيد من الرسائل
    }

    return interaction.editReply({
      embeds: [success(`تم مسح **${totalDeleted}** رسالة بنجاح.`)]
    });
  }
};