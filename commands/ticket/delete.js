const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const keyValueService = require("../../services/keyValueService");
const { canManageTicket, normalizeTicketMetadata } = require("../../utils/ticketUtils");

module.exports = {
    adminsOnly: false,
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('حذف قناة التذكرة الحالية'),
        
    async execute(interaction) {
        const Ticket = await keyValueService.get('ticketDB', `TICKET-PANEL_${interaction.channel.id}`);
        if (!Ticket) {
            return interaction.reply({ content: 'هذه القناة ليست تذكرة', ephemeral: true });
        }

        if (!canManageTicket(interaction.member, Ticket)) {
            return interaction.reply({ content: '{emoji:circlex} هذا الأمر متاح لفريق الدعم أو الإداريين فقط.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setDescription('سيتم حذف التذكرة خلال ثوانٍ');
        
        await interaction.reply({ embeds: [embed] });
        
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 4500);

        const Logs = await keyValueService.get('ticketDB', `LogsRoom_${interaction.guild.id}`);
        const Log = interaction.guild.channels.cache.get(Logs);
        const normalized = normalizeTicketMetadata(Ticket, interaction.channel);
        const logEmbed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTitle('حذف تذكرة')
            .addFields(
                { name: 'اسم التذكرة', value: `${interaction.channel.name}` },
                { name: 'صاحب التذكرة', value: normalized.ownerId ? `<@${normalized.ownerId}>` : 'غير معروف' },
                { name: 'حذف بواسطة', value: `${interaction.user}` },
            )
            .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

        Log?.send({ embeds: [logEmbed] });
        await keyValueService.delete('ticketDB', `TICKET-PANEL_${interaction.channel.id}`);
    }
}
