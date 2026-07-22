const { SlashCommandBuilder } = require("discord.js");
const keyValueService = require("../../services/keyValueService");

module.exports = {
    adminsOnly: true,
    data: new SlashCommandBuilder()
        .setName('set-ticket-log')
        .setDescription('تحديد روم اللوغ')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('اللوغ المطلوب')
                .setRequired(true)
                .addChoices(
                    { name: 'اللوق', value: 'log' },
                    { name: 'النسخ النصية', value: 'transcripte' }
                )
        )
        .addChannelOption(option =>
            option
                .setName('room')
                .setDescription('اختر الروم')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            const command = interaction.options.getString('type');
            const room = interaction.options.getChannel('room');

            if (!command || !room || !room.id) {
                return interaction.reply({ content: "الروم الذي اخترته غير موجود", ephemeral: true });
            }

            let key;
            if (command === 'log') {
                key = `LogsRoom_${interaction.guild.id}`;
            } else if (command === 'transcripte') {
                key = `TransRoom_${interaction.guild.id}`;
            } else {
                return interaction.reply({ content: "هناك خطأ", ephemeral: true });
            }

            await keyValueService.set('ticketDB', key, room.id);

            return interaction.reply({ content: `**تم تحديد الروم <#${room.id}> بنجاح .**` });
        } catch (error) {
            console.error("خطأ أثناء تحديد روم لوق التذاكر:", error);
            return interaction.reply({ content: `حدث خطأ ما، حاول مرة أخرى.`, ephemeral: true });
        }
    }
};