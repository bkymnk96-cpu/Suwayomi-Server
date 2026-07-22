const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");
const keyValueService = require("../../services/keyValueService");

function paginate(items, page = 0, perPage = 25) {
  const totalPages = Math.ceil(items.length / perPage);
  const sliced = items.slice(page * perPage, (page + 1) * perPage);
  return { totalPages, page, items: sliced };
}

function createPresetPaginationRow(currentPage, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("preset_page_prev")
      .setEmoji(require('../../utils/emojis').playerpause.toString())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 0),
    new ButtonBuilder()
      .setCustomId("preset_page_next")
      .setEmoji(require('../../utils/emojis').playerplay.toString())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("send-preset")
    .setDescription("اختيار إعداد مسبق وإرسال لوحة تذاكر جاهزة"),

  async execute(interaction) {
    if (!interaction.member.permissions.has(require("discord.js").PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "{emoji:circlex} تحتاج إلى صلاحية الإدارة لاستخدام هذا الأمر.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // جلب الإعدادات المخزنة
    const presets = (await keyValueService.get("ticketPresets", interaction.guild.id)) || {};
    const presetNames = Object.keys(presets);

    if (presetNames.length === 0) {
      return interaction.reply({
        content: "{emoji:circlex} لا توجد أي إعدادات مسبقة محفوظة. استخدم `/setup-ticket` أولاً.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // تجهيز الصفحة الأولى
    let currentPage = 0;
    const itemsPerPage = 25;
    const totalPages = Math.ceil(presetNames.length / itemsPerPage);

    const buildPresetSelectMenu = (page) => {
      const { items: pageNames } = paginate(presetNames, page, itemsPerPage);
      const options = pageNames.map(name => ({
        label: name.length > 100 ? name.substring(0, 97) + "..." : name,
        value: name,
      }));
      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_preset")
          .setPlaceholder("اختر إعداداً مسبقاً")
          .addOptions(options)
      );
    };

    // إرسال القائمة الأولية
    const components = [buildPresetSelectMenu(currentPage)];
    if (totalPages > 1) {
      components.push(createPresetPaginationRow(currentPage, totalPages));
    }

    await interaction.reply({
      content: "{emoji:list} **اختر الإعداد المسبق الذي تريد إرساله:**",
      components,
      flags: MessageFlags.Ephemeral,
    });

    // انتظار التفاعل (اختيار أو تنقل)
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 120_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "select_preset") {
        // تم اختيار إعداد
        const selectedName = i.values[0];
        const settings = presets[selectedName];

        // إنشاء لوحة التذاكر
        const embed = new EmbedBuilder()
          .setColor(settings.color)
          .setTitle(settings.title)
          .setDescription(settings.description)
          .setFooter({
            text: interaction.guild.name,
            iconURL: interaction.guild.iconURL(),
          })
          .setTimestamp()
          .setThumbnail(settings.thumbnail ? interaction.guild.iconURL() : null)
          .setImage(settings.embedImage || null);

        const randomId = `ticket_${Math.random().toString(36).substr(2, 9)}`;
        const btn = new ButtonBuilder()
          .setCustomId(randomId)
          .setLabel(settings.buttonName)
          .setStyle(ButtonStyle[settings.buttonStyle]);
        if (settings.buttonEmoji) btn.setEmoji(settings.buttonEmoji);

        const row = new ActionRowBuilder().addComponents(btn);
        await interaction.channel.send({ embeds: [embed], components: [row] });

        await keyValueService.set(
          "ticketDB",
          `Ticket_${interaction.channel.id}_${randomId}`,
          {
            Support: settings.supportRoleId,
            Category: settings.categoryId,
            Internal: settings.welcomeMessage,
            Type: settings.welcomeType,
            Ask: settings.askReason,
          }
        );

        // إيقاف المجمّع وإغلاق القائمة
        collector.stop();
        await i.update({
          content: `{emoji:circlecheck} تم إرسال لوحة التذاكرة من الإعداد \`${selectedName}\`.`,
          components: [],
        });
      } else if (i.customId === "preset_page_prev" || i.customId === "preset_page_next") {
        // التنقل بين الصفحات
        if (i.customId === "preset_page_prev") currentPage--;
        else if (i.customId === "preset_page_next") currentPage++;

        const newComponents = [buildPresetSelectMenu(currentPage)];
        if (totalPages > 1) {
          newComponents.push(createPresetPaginationRow(currentPage, totalPages));
        }
        await i.update({ components: newComponents });
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await interaction.editReply({
          content: "{emoji:clock} انتهت مهلة الاختيار. يمكنك استخدام الأمر مرة أخرى.",
          components: [],
        });
      }
    });
  },
};