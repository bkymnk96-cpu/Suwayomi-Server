const base = require('./admin-points');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
module.exports = { category: 'admin', data: new SlashCommandBuilder().setName('admin-reset-points').setDescription('إعادة تعيين نقاط إدارة عضو').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('السبب')), async execute(interaction) { interaction.options.getSubcommand = () => 'reset'; return base.execute(interaction); } };
