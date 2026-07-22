const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const keyValueService = require("../../services/keyValueService");

const embedColors = [
  { name: "زيوس", value: "#FF0000" },
  { name: "أخضر", value: "#00FF00" },
  { name: "أزرق", value: "#0000FF" },
  { name: "أصفر", value: "#FFFF00" },
  { name: "برتقالي", value: "#FFA500" },
  { name: "بنفسجي", value: "#800080" },
  { name: "وردي", value: "#FFC0CB" },
  { name: "رمادي", value: "#808080" },
  { name: "أسود", value: "#000000" },
  { name: "أبيض", value: "#FFFFFF" },
  { name: "ذهبي", value: "#FFD700" },
  { name: "فضي", value: "#C0C0C0" },
  { name: "سماوي", value: "#00FFFF" },
  { name: "أخضر فاتح", value: "#90EE90" },
  { name: "بنفسجي فاتح", value: "#DDA0DD" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome-setup")
    .setDescription("تصميم قالب رسالة ترحيب للتذاكر"),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "{emoji:circlex} تحتاج إلى صلاحية الإدارة لاستخدام هذا الأمر.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // الإعدادات الافتراضية لقالب الترحيب
    const welcomeTemplate = {
      title: "مرحباً بك في تذكرتك",
      description: "سيقوم فريق الدعم بالرد عليك قريباً.",
      color: "#00FF00",
      thumbnail: false,
      image: "",
      messageType: "embed", // القيمة المبدئية ستُستبدل بعد اختيار المستخدم
    };

    const generatePreviewEmbed = () =>
      new EmbedBuilder()
        .setColor(welcomeTemplate.color)
        .setTitle(welcomeTemplate.title || null)
        .setDescription(welcomeTemplate.description || null)
        .setThumbnail(
          welcomeTemplate.thumbnail ? interaction.guild.iconURL() : null
        )
        .setImage(welcomeTemplate.image || null)
        .setFooter({ text: "معاينة رسالة الترحيب داخل التذكرة" })
        .setTimestamp();

    const buildMessagePayload = () => {
      if (welcomeTemplate.messageType === "message") {
        let content = "";
        if (welcomeTemplate.title) {
          content += `**${welcomeTemplate.title}**\n`;
        }
        if (welcomeTemplate.description) {
          content += `${welcomeTemplate.description}\n`;
        }
        if (welcomeTemplate.image) {
          content += `\n[صورة](${welcomeTemplate.image})`;
        }
        if (!content.trim()) {
          content = "رسالة ترحيب فارغة";
        }
        return { content };
      } else {
        return { embeds: [generatePreviewEmbed()] };
      }
    };

    const mainButtons = () => {
      const buttons = [];
      buttons.push(
        new ButtonBuilder()
          .setCustomId("edit_title")
          .setLabel("زيوس").setEmoji(require('../../utils/emojis').adjustments.toString())
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("edit_description")
          .setLabel("النص").setEmoji(require('../../utils/emojis').message.toString())
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("edit_image")
          .setLabel("️ صورة").setEmoji(require('../../utils/emojis').photo.toString())
          .setStyle(ButtonStyle.Secondary)
      );

      if (welcomeTemplate.messageType === "embed") {
        buttons.push(
          new ButtonBuilder()
            .setCustomId("edit_color")
            .setLabel("اللون").setEmoji(require('../../utils/emojis').photo.toString())
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("toggle_thumbnail")
            .setLabel(
              welcomeTemplate.thumbnail ? "{emoji:circlecheck} الأيقونة" : "{emoji:circlex} الأيقونة"
            )
            .setStyle(ButtonStyle.Secondary)
        );
      }

      buttons.push(
        new ButtonBuilder()
          .setCustomId("toggle_message_type")
          .setLabel(
            welcomeTemplate.messageType === "embed"
              ? "{emoji:list} رسالة عادية"
              : "{emoji:list} إيمبد"
          )
          .setStyle(ButtonStyle.Secondary)
      );

      return new ActionRowBuilder().addComponents(buttons);
    };

    const actionRow = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("save_template")
          .setLabel("حفظ القالب").setEmoji(require('../../utils/emojis').folderopen.toString())
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancel")
          .setLabel("إلغاء").setEmoji(require('../../utils/emojis').circlex.toString())
          .setStyle(ButtonStyle.Danger)
      );

    // الخطوة الأولى: اختيار نوع الرسالة
    await interaction.reply({
      content: "**اختر نوع رسالة الترحيب:**",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("type_embed")
            .setLabel("إيمبد")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("type_message")
            .setLabel("رسالة عادية")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("إلغاء").setEmoji(require('../../utils/emojis').circlex.toString())
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const filter = (i) => i.user.id === interaction.user.id;

    try {
      // انتظار اختيار النوع الأول
      const typeChoice = await interaction.channel.awaitMessageComponent({
        filter,
        time: 300_000,
      });

      if (typeChoice.customId === "cancel") {
        await typeChoice.deferUpdate();
        return interaction.editReply({
          content: null,
          components: [],
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setDescription("{emoji:circlex} تم إلغاء تصميم القالب."),
          ],
        });
      }

      if (typeChoice.customId === "type_embed") {
        welcomeTemplate.messageType = "embed";
      } else if (typeChoice.customId === "type_message") {
        welcomeTemplate.messageType = "message";
      }

      await typeChoice.deferUpdate();
      await interaction.editReply({
        ...buildMessagePayload(),
        components: [mainButtons(), actionRow()],
      });

      // بدء حلقة التعديلات
      while (true) {
        const i = await interaction.channel.awaitMessageComponent({
          filter,
          time: 600_000,
        });

        if (i.customId === "cancel") {
          await i.deferUpdate();
          return interaction.editReply({
            components: [],
            embeds: [
              new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("{emoji:circlex} تم إلغاء تصميم القالب."),
            ],
          });
        }

        if (i.customId === "save_template") {
          const modal = new ModalBuilder()
            .setCustomId("modal_template_name")
            .setTitle("حفظ قالب الترحيب");
          const input = new TextInputBuilder()
            .setCustomId("template_name")
            .setLabel("أدخل اسماً للقالب")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await i.showModal(modal);

          const modalSubmit = await i.awaitModalSubmit({ time: 120_000 });
          const name = modalSubmit.fields.getTextInputValue("template_name").trim();

          const templates =
            (await keyValueService.get("welcomeTemplates", interaction.guild.id)) || {};
          templates[name] = { ...welcomeTemplate };

          await keyValueService.set("welcomeTemplates", interaction.guild.id, templates);

          await modalSubmit.reply({
            content: `{emoji:circlecheck} تم حفظ قالب الترحيب باسم \`${name}\`.`,
            flags: MessageFlags.Ephemeral,
          });
          await i.editReply({
            components: [],
            embeds: [
              new EmbedBuilder()
                .setColor("#00FF00")
                .setDescription("{emoji:circlecheck} تم حفظ القالب بنجاح."),
            ],
          });
          return;
        }

        // --- تعديل العنوان ---
        if (i.customId === "edit_title") {
          const modal = new ModalBuilder()
            .setCustomId("modal_title")
            .setTitle("عنوان رسالة الترحيب");
          const input = new TextInputBuilder()
            .setCustomId("input")
            .setLabel("العنوان (اتركه فارغاً للإخفاء)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(welcomeTemplate.title);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await i.showModal(modal);

          const m = await i.awaitModalSubmit({ time: 120_000 });
          welcomeTemplate.title = m.fields.getTextInputValue("input");
          await m.deferUpdate();
          await m.editReply({
            ...buildMessagePayload(),
            components: [mainButtons(), actionRow()],
          });
          continue;
        }

        // --- تعديل النص ---
        if (i.customId === "edit_description") {
          const modal = new ModalBuilder()
            .setCustomId("modal_description")
            .setTitle("نص رسالة الترحيب");
          const input = new TextInputBuilder()
            .setCustomId("input")
            .setLabel("النص (اتركه فارغاً للإخفاء)")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(welcomeTemplate.description);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await i.showModal(modal);

          const m = await i.awaitModalSubmit({ time: 120_000 });
          welcomeTemplate.description = m.fields.getTextInputValue("input");
          await m.deferUpdate();
          await m.editReply({
            ...buildMessagePayload(),
            components: [mainButtons(), actionRow()],
          });
          continue;
        }

        // --- تعديل الصورة ---
        if (i.customId === "edit_image") {
          const modal = new ModalBuilder()
            .setCustomId("modal_image")
            .setTitle("صورة رسالة الترحيب");
          const input = new TextInputBuilder()
            .setCustomId("input")
            .setLabel("رابط الصورة (اتركه فارغاً للحذف)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(welcomeTemplate.image);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await i.showModal(modal);

          const m = await i.awaitModalSubmit({ time: 120_000 });
          welcomeTemplate.image = m.fields.getTextInputValue("input");
          await m.deferUpdate();
          await m.editReply({
            ...buildMessagePayload(),
            components: [mainButtons(), actionRow()],
          });
          continue;
        }

        // --- تغيير اللون (للإيمبد فقط) ---
        if (i.customId === "edit_color") {
          if (welcomeTemplate.messageType !== "embed") {
            await i.deferUpdate();
            continue;
          }
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("select_color")
              .setPlaceholder("اختر لوناً")
              .addOptions(
                embedColors.map((c) => ({ label: c.name, value: c.value }))
              )
          );
          await i.deferUpdate();
          await i.editReply({ components: [row, actionRow()] });

          const colorI = await interaction.channel.awaitMessageComponent({
            filter,
            time: 120_000,
          });
          if (colorI.customId === "select_color") {
            welcomeTemplate.color = colorI.values[0];
            await colorI.deferUpdate();
            await colorI.editReply({
              ...buildMessagePayload(),
              components: [mainButtons(), actionRow()],
            });
          }
          continue;
        }

        // --- تفعيل/تعطيل أيقونة السيرفر (للإيمبد فقط) ---
        if (i.customId === "toggle_thumbnail") {
          if (welcomeTemplate.messageType !== "embed") {
            await i.deferUpdate();
            continue;
          }
          welcomeTemplate.thumbnail = !welcomeTemplate.thumbnail;
          await i.deferUpdate();
          await i.editReply({
            ...buildMessagePayload(),
            components: [mainButtons(), actionRow()],
          });
          continue;
        }

        // --- تبديل نوع الرسالة ---
        if (i.customId === "toggle_message_type") {
          welcomeTemplate.messageType =
            welcomeTemplate.messageType === "embed" ? "message" : "embed";
          await i.deferUpdate();
          await i.editReply({
            ...buildMessagePayload(),
            components: [mainButtons(), actionRow()],
          });
          continue;
        }
      }
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        components: [],
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription("{emoji:clock} انتهت مهلة التصميم أو حدث خطأ."),
        ],
      });
    }
  },
};