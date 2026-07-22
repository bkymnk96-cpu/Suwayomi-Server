const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
const keyValueService = require("../../services/keyValueService");
const { canCloseTicket, getOwnerId, markTicketClosed, sendTicketCloseLog } = require("../../utils/ticketUtils");

module.exports = {
    adminsOnly: false,
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('إغلاق قناة التذكرة الحالية'),
    
    /**
     * @param { import('discord.js').ChatInputCommandInteraction } interaction 
     */
    async execute(interaction) {
        const ticket = await keyValueService.get('ticketDB', `TICKET-PANEL_${interaction.channel.id}`);
        if (!ticket) {
            return interaction.reply({ content: `> هذه القناة ليست تذكرة`, ephemeral: true });
        }

        if (!canCloseTicket(interaction.member, interaction.user, ticket)) {
            return interaction.reply({ content: `{emoji:circlex} لا تمتلك صلاحية إغلاق هذه التذكرة.`, ephemeral: true });
        }

        const closedTicket = await markTicketClosed(interaction.channel, interaction.user);
        const ownerId = getOwnerId(closedTicket);
        if (ownerId) await interaction.channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});

        const embed2 = new EmbedBuilder()
            .setDescription(`تم إغلاق التذكرة بواسطة ${interaction.user}`)
            .setColor("Yellow");

        const embed = new EmbedBuilder()
            .setDescription("```لوحة فريق الدعم.```")
            .setColor("DarkButNotBlack");

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('delete').setLabel('حذف').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('Open').setLabel('فتح').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('Tran').setLabel('نسخة نصية').setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed2, embed], components: [row] });
        await sendTicketCloseLog(interaction.guild, closedTicket, interaction.channel, interaction.user);
    }
};