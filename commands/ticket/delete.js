const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const emojis = require('../../utils/emojis');
const { error } = require('../../utils/embeds');
const { canManageTicket, sendTicketCloseLog } = require('../../utils/ticketUtils');
module.exports = { category:'ticket', data:new SlashCommandBuilder().setName('delete').setDescription('حذف قناة التذكرة الحالية'), async execute(interaction){ const ticket=db.getTicketByChannel(interaction.channel.id); if(!ticket) return interaction.reply({embeds:[error('هذه القناة ليست تذكرة')],flags:['Ephemeral']}); if(!canManageTicket(interaction.member,ticket,db.getTicketSettings(interaction.guild.id))) return interaction.reply({embeds:[error('هذا الأمر متاح لفريق الدعم أو الإداريين فقط.')],flags:['Ephemeral']}); await interaction.reply({embeds:[new EmbedBuilder().setColor(0xED4245).setDescription(`${emojis.trash} سيتم حذف التذكرة خلال ثوانٍ`)]}); await sendTicketCloseLog(interaction.guild,ticket,interaction.channel,interaction.user); db.deleteTicket(interaction.channel.id); setTimeout(()=>interaction.channel.delete().catch(()=>null),4500); }};
