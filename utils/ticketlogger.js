const { EmbedBuilder } = require("discord.js");
const db = require("../database/db");

module.exports = async function logTicket(
    guild,
    settings,
    title,
    description,
    color = "#D4AF37"
) {

    if (!settings.log_channel) return;

    const channel =
        guild.channels.cache.get(
            settings.log_channel
        );

    if (!channel) return;

    await channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .setTimestamp()
        ]
    }).catch(() => null);

};