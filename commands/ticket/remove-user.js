const { SlashCommandBuilder } = require("discord.js");
const keyValueService = require("../../services/keyValueService");
const { canManageTicket } = require("../../utils/ticketUtils");

module.exports = {
    adminsOnly: false,
    data: new SlashCommandBuilder()
        .setName('remove-user')
        .setDescription('إزالة عضو من قناة التذكرة الحالية')
        .addUserOption(option => 
            option
                .setName('user')
                .setDescription('اختر العضو لإزالته')
                .setRequired(true)
        ),
    
    /**
     * @param { import('discord.js').ChatInputCommandInteraction } interaction 
     */
    async execute(interaction) {
        const ticketData = await keyValueService.get('ticketDB', `TICKET-PANEL_${interaction.channel.id}`);
        if (!ticketData) {
            return interaction.reply({ content: `> هذه القناة ليست تذكرة`, ephemeral: true });
        }

        if (!canManageTicket(interaction.member, ticketData)) {
            return interaction.reply({ content: `{emoji:circlex} لا تمتلك صلاحية إزالة أعضاء من هذه التذكرة.`, ephemeral: true });
        }

        const member = interaction.options.getMember('user');
        await interaction.channel.permissionOverwrites.edit(member.user.id, {
            ViewChannel: false,
            SendMessages: false
        });

        return interaction.reply({ content: `{emoji:circlecheck} تمت إزالة ${member} من التذكرة ${interaction.channel}.` });
    }
};
