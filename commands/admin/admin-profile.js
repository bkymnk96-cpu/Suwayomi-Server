const base = require('./admin-points');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
module.exports = { category: 'admin', data: new SlashCommandBuilder().setName('admin-profile').setDescription('عرض ملف نقاط عضو إداري').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)), async execute(interaction) { interaction.options.getSubcommand = () => 'profile'; return base.execute(interaction); } };
