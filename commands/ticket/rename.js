const { SlashCommandBuilder } = require("discord.js");
const keyValueService = require("../../services/keyValueService");
const { canManageTicket } = require("../../utils/ticketUtils");

module.exports = {
    adminsOnly: false,
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('تغيير اسم قناة التذكرة الحالية')
        .addStringOption(option => 
            option
                .setName('name')
                .setDescription('اكتب اسم القناة الجديد')
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
            return interaction.reply({ content: `{emoji:circlex} لا تمتلك صلاحية تغيير اسم هذه التذكرة.`, ephemeral: true });
        }

        const newName = interaction.options.getString('name');
        if (!newName) {
            return interaction.reply({ content: `لم يتم إدخال اسم جديد لقناة التذكرة.`, ephemeral: true });
        }

        await interaction.channel.setName(newName);
        return interaction.reply({ content: `{emoji:circlecheck} تم تغيير اسم التذكرة إلى \`${newName}\``, ephemeral: true });
    }
};
