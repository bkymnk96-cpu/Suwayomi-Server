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
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const keyValueService = require("../../services/keyValueService");

const embedColors = [
  { name: "أحمر", value: "#FF0000" },
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

const buttonStyles = [
  { name: "أحمر (خطر)", value: "Danger" },
  { name: "أخضر (نجاح)", value: "Success" },
  { name: "أزرق (أساسي)", value: "Primary" },
  { name: "رمادي (ثانوي)", value: "Secondary" },
];

function paginate(items, page = 0, perPage = 25) {
  const totalPages = Math.ceil(items.length / perPage);
  const sliced = items.slice(page * perPage, (page + 1) * perPage);
  return { totalPages, page, items: sliced };
}

function createPaginationRow(currentPage, totalPages, type) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`page_prev_${type}`)
      .setEmoji(require('../../utils/emojis').playerpause.toString())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 0),
    new ButtonBuilder()
      .setCustomId(`page_next_${type}`)
      .setEmoji(require('../../utils/emojis').playerplay.toString())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`search_${type}`)
      .setLabel("بحث").setEmoji(require('../../utils/emojis').infocircle.toString())
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("back_to_main")
      .setLabel("رجوع").setEmoji(require('../../utils/emojis').folderopen.toString())
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-ticket-button")
    .setDescription("إضافة زر تذكرة إلى رسالة موجودة بواجهة تفاعلية مباشرة"),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "{emoji:circlex} تحتاج إلى صلاحية الإدارة لاستخدام هذا الأمر.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const welcomeTemplates = (await keyValueService.get("welcomeTemplates", interaction.guild.id)) || {};

    const settings = {
      targetMessageId: null,
      buttonName: "فتح تذكرة",
      buttonStyle: "Primary",
      buttonEmoji: "",
      supportRoleId: null,
      categoryId: null,
      welcomeMessage: "مرحباً بك في تذكرتك! سيقوم فريق الدعم بالرد عليك قريباً.",
      welcomeType: "embed",
      askReason: false,
    };

    const generatePreviewEmbed = () =>
      new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("إعدادات زر التذكرة")
        .addFields(
          { name: "{emoji:mail} الرسالة المستهدفة", value: settings.targetMessageId ? `\`${settings.targetMessageId}\`` : "{emoji:circlex} غير محددة", inline: false },
          { name: "{emoji:adjustments} اسم الزر", value: settings.buttonName || "غير محدد", inline: true },
          { name: "{emoji:photo} لون الزر", value: settings.buttonStyle, inline: true },
          { name: "{emoji:moodsmile} إيموجي", value: settings.buttonEmoji || "لا يوجد", inline: true },
          { name: "{emoji:user} رتبة الدعم", value: settings.supportRoleId ? `<@&${settings.supportRoleId}>` : "{emoji:circlex} غير محددة", inline: true },
          { name: "{emoji:folderopen} الفئة", value: settings.categoryId ? `<#${settings.categoryId}>` : "{emoji:circlex} غير محددة", inline: true },
          { name: "{emoji:message} نوع الترحيب", value: settings.welcomeType === "embed" ? "تضمين" : "نصية", inline: true },
          { name: "{emoji:infocircle} سؤال السبب", value: settings.askReason ? "مفعل" : "معطل", inline: true },
          { name: "{emoji:mail} رسالة الترحيب", value: settings.welcomeMessage.substring(0, 100) + (settings.welcomeMessage.length > 100 ? "..." : ""), inline: false }
        )
        .setFooter({ text: "{emoji:settings} معالج إضافة زر التذكرة | معاينة مباشرة" })
        .setTimestamp();

    const mainButtons = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("edit_message").setLabel("تحديد الرسالة").setEmoji(require('../../utils/emojis').mail.toString()).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("edit_basics").setLabel("الإعدادات الأساسية").setEmoji(require('../../utils/emojis').settings.toString()).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("edit_advanced").setLabel("خيارات التذكرة").setEmoji(require('../../utils/emojis').star.toString()).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("send_panel").setLabel("تأكيد وإضافة").setEmoji(require('../../utils/emojis').bolt.toString()).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("cancel_setup").setLabel("إلغاء").setEmoji(require('../../utils/emojis').circlex.toString()).setStyle(ButtonStyle.Danger)
      );

    await interaction.reply({
      embeds: [generatePreviewEmbed()],
      components: [mainButtons()],
      fetchReply: true,
    });

    const paginationCache = {
      roles: { items: [], page: 0, filtered: null },
      categories: { items: [], page: 0, filtered: null },
    };

    function buildSelectMenu(items, customId, placeholder) {
      const options = items.map((item) => ({
        label: item.name.length > 100 ? item.name.substring(0, 97) + "..." : item.name,
        value: item.id,
      }));
      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options)
      );
    }

    while (true) {
      try {
        const filter = (i) => i.user.id === interaction.user.id;
        const componentInteraction = await interaction.channel.awaitMessageComponent({
          filter,
          time: 900_000,
        });

        if (componentInteraction.isButton()) {
          const btnId = componentInteraction.customId;

          switch (btnId) {
            case "cancel_setup":
              await componentInteraction.deferUpdate();
              return componentInteraction.editReply({
                components: [],
                embeds: [new EmbedBuilder().setColor("#FF0000").setDescription("{emoji:circlex} تم إلغاء العملية.")],
              });

            case "edit_message": {
              const modal = new ModalBuilder()
                .setCustomId("modal_message_id")
                .setTitle("تحديد الرسالة المستهدفة");
              modal.addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("معرف الرسالة")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("أدخل معرف الرسالة الموجودة في هذه القناة")
                    .setRequired(true)
                    .setValue(settings.targetMessageId || "")
                )
              );
              await componentInteraction.showModal(modal);
              try {
                const modalSubmit = await componentInteraction.awaitModalSubmit({ time: 120_000, filter });
                const input = modalSubmit.fields.getTextInputValue("input").trim();
                try {
                  await interaction.channel.messages.fetch(input);
                  settings.targetMessageId = input;
                  await modalSubmit.update({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
                } catch {
                  await modalSubmit.reply({ content: "{emoji:circlex} لم يتم العثور على رسالة بهذا المعرف في هذه القناة.", flags: MessageFlags.Ephemeral });
                }
              } catch {}
              continue;
            }

            case "send_panel": {
              const missing = [];
              if (!settings.targetMessageId) missing.push("الرسالة المستهدفة");
              if (!settings.supportRoleId) missing.push("رتبة الدعم");
              if (!settings.categoryId) missing.push("فئة القنوات");

              if (missing.length > 0) {
                await componentInteraction.deferUpdate();
                const msg = `{emoji:alerttriangle}️ يجب اختيار ${missing.join(" و ")} قبل الإضافة.`;
                await componentInteraction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
                continue;
              }

              try {
                await interaction.channel.messages.fetch(settings.targetMessageId);
              } catch {
                await componentInteraction.deferUpdate();
                await componentInteraction.followUp({ content: "{emoji:circlex} تعذر العثور على الرسالة المحددة. تأكد من المعرف.", flags: MessageFlags.Ephemeral });
                continue;
              }

              await componentInteraction.deferUpdate();
              break;
            }

            case "edit_basics": {
              await componentInteraction.deferUpdate();
              const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId("basic_select")
                  .setPlaceholder("اختر العنصر لتعديله")
                  .addOptions([
                    { label: "اسم الزر", value: "buttonName", emoji: "{emoji:adjustments}" },
                    { label: "لون الزر", value: "buttonStyle", emoji: "{emoji:photo}" },
                    { label: "إيموجي الزر", value: "buttonEmoji", emoji: "{emoji:moodsmile}" },
                    { label: "رتبة الدعم", value: "supportRole", emoji: "{emoji:user}" },
                    { label: "فئة القنوات", value: "category", emoji: "{emoji:folderopen}" },
                  ])
              );
              await componentInteraction.editReply({ components: [row, mainButtons()] });
              continue;
            }

            case "edit_advanced": {
              await componentInteraction.deferUpdate();
              const advOptions = [
                {
                  label: `نوع رسالة الترحيب (${settings.welcomeType === "embed" ? "تضمين" : "نصية"})`,
                  value: "welcomeType",
                  emoji: "{emoji:message}",
                },
                {
                  label: `سؤال السبب ${settings.askReason ? "{emoji:circlecheck}" : "{emoji:circlex}"}`,
                  value: "askReason",
                  emoji: "{emoji:infocircle}",
                },
                { label: "رسالة الترحيب", value: "welcomeMessage", emoji: "{emoji:mail}" },
              ];

              const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId("advanced_select")
                  .setPlaceholder("اختر العنصر لتعديله")
                  .addOptions(advOptions)
              );
              await componentInteraction.editReply({ components: [row, mainButtons()] });
              continue;
            }

            default: {
              if (btnId.startsWith("page_prev_") || btnId.startsWith("page_next_") || btnId.startsWith("search_") || btnId === "back_to_main") {
                await componentInteraction.deferUpdate();
                if (btnId === "back_to_main") {
                  paginationCache.roles.page = 0;
                  paginationCache.roles.filtered = null;
                  paginationCache.categories.page = 0;
                  paginationCache.categories.filtered = null;
                  await componentInteraction.editReply({ components: [mainButtons()] });
                  continue;
                }

                const type = btnId.includes("roles") ? "roles" : "categories";
                const cache = paginationCache[type];
                let items = cache.filtered || cache.items;

                if (btnId.startsWith("search_")) {
                  const modal = new ModalBuilder()
                    .setCustomId(`modal_search_${type}`)
                    .setTitle(`بحث عن ${type === "roles" ? "رتبة" : "فئة"}`);
                  modal.addComponents(
                    new ActionRowBuilder().addComponents(
                      new TextInputBuilder()
                        .setCustomId("query")
                        .setLabel("اكتب جزءاً من الاسم")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                    )
                  );
                  await componentInteraction.showModal(modal);
                  continue;
                }

                if (btnId.startsWith("page_prev_")) cache.page = Math.max(0, cache.page - 1);
                else if (btnId.startsWith("page_next_")) {
                  const { totalPages } = paginate(items, cache.page);
                  cache.page = Math.min(totalPages - 1, cache.page + 1);
                }

                const { items: pageItems, totalPages, page } = paginate(items, cache.page);
                const selectMenu = buildSelectMenu(pageItems, `select_${type}`, `اختر ${type === "roles" ? "الرتبة" : "الفئة"}`);
                const pagRow = createPaginationRow(page, totalPages, type);
                await componentInteraction.editReply({ components: [selectMenu, pagRow] });
                continue;
              }
              await componentInteraction.deferUpdate().catch(() => {});
              continue;
            }
          }

          if (btnId === "send_panel") break;
        }

        if (componentInteraction.isStringSelectMenu()) {
          const value = componentInteraction.values[0];
          const customId = componentInteraction.customId;

          if (customId === "select_welcome") {
            if (value === "__custom__") {
              const modal = new ModalBuilder()
                .setCustomId("modal_welcome")
                .setTitle("رسالة ترحيب مخصصة");
              modal.addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("رسالة الترحيب (اتركها فارغة لعدم وجود رسالة)")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setValue(settings.welcomeMessage.startsWith("[template:") ? "" : settings.welcomeMessage)
                )
              );
              await componentInteraction.showModal(modal);
              continue;
            } else {
              settings.welcomeMessage = `[template:${value}]`;
              await componentInteraction.deferUpdate();
              await componentInteraction.editReply({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
              continue;
            }
          }

          const needsModal = ["buttonName", "buttonEmoji"];
          if (needsModal.includes(value)) {
            let modal;
            const currentValue = {
              buttonName: settings.buttonName,
              buttonEmoji: settings.buttonEmoji,
            }[value];

            if (value === "buttonName") {
              modal = new ModalBuilder().setCustomId("modal_buttonName").setTitle("تغيير اسم الزر");
              modal.addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder().setCustomId("input").setLabel("اسم الزر الجديد").setStyle(TextInputStyle.Short).setRequired(false).setValue(currentValue)
                )
              );
            } else if (value === "buttonEmoji") {
              modal = new ModalBuilder().setCustomId("modal_buttonEmoji").setTitle("إضافة إيموجي للزر");
              modal.addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder().setCustomId("input").setLabel("أدخل الإيموجي (اختياري)").setStyle(TextInputStyle.Short).setRequired(false).setValue(currentValue)
                )
              );
            }

            await componentInteraction.showModal(modal);
            try {
              const modalSubmit = await componentInteraction.awaitModalSubmit({ time: 120_000 });
              const input = modalSubmit.fields.getTextInputValue("input");
              if (modalSubmit.customId === "modal_buttonName") settings.buttonName = input;
              else if (modalSubmit.customId === "modal_buttonEmoji") settings.buttonEmoji = input;
              await modalSubmit.update({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
            } catch (error) {
              if (error.code === "INTERACTION_NOT_REPLIED") {
                await interaction.editReply({ components: [mainButtons()] });
              }
            }
            continue;
          }

          if (value === "welcomeMessage") {
            const templateNames = Object.keys(welcomeTemplates);
            const options = [];
            if (templateNames.length > 0) {
              templateNames.forEach(name => {
                options.push({ label: name, value: name, emoji: "{emoji:folder}" });
              });
            }
            options.push({ label: "{emoji:adjustments}️ تخصيص يدوي", value: "__custom__", emoji: "{emoji:adjustments}" });

            const welcomeRow = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId("select_welcome")
                .setPlaceholder("اختر قالب ترحيب أو اكتب يدوياً")
                .addOptions(options)
            );
            await componentInteraction.deferUpdate();
            await componentInteraction.editReply({ components: [welcomeRow, mainButtons()] });
            continue;
          }

          await componentInteraction.deferUpdate();

          switch (customId) {
            case "basic_select":
              if (value === "buttonStyle") {
                const row = new ActionRowBuilder().addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId("select_buttonStyle")
                    .setPlaceholder("اختر لون الزر")
                    .addOptions(buttonStyles.map(s => ({ label: s.name, value: s.value })))
                );
                await componentInteraction.editReply({ components: [row, mainButtons()] });
              } else if (value === "supportRole") {
                const allRoles = interaction.guild.roles.cache
                  .filter(r => !r.managed && r.name !== "@everyone")
                  .sort((a, b) => b.position - a.position)
                  .map(r => ({ name: r.name, id: r.id }));
                paginationCache.roles.items = allRoles;
                paginationCache.roles.page = 0;
                paginationCache.roles.filtered = null;

                if (allRoles.length <= 25) {
                  const menu = buildSelectMenu(allRoles, "select_supportRole", "اختر رتبة الدعم");
                  await componentInteraction.editReply({ components: [menu, mainButtons()] });
                } else {
                  const { items } = paginate(allRoles, 0);
                  const menu = buildSelectMenu(items, "select_supportRole", "اختر رتبة الدعم");
                  const pagRow = createPaginationRow(0, Math.ceil(allRoles.length / 25), "roles");
                  await componentInteraction.editReply({ components: [menu, pagRow] });
                }
              } else if (value === "category") {
                const allCategories = interaction.guild.channels.cache
                  .filter(c => c.type === ChannelType.GuildCategory)
                  .sort((a, b) => a.position - b.position)
                  .map(c => ({ name: c.name, id: c.id }));
                paginationCache.categories.items = allCategories;
                paginationCache.categories.page = 0;
                paginationCache.categories.filtered = null;

                if (allCategories.length <= 25) {
                  const menu = buildSelectMenu(allCategories, "select_category", "اختر الفئة");
                  await componentInteraction.editReply({ components: [menu, mainButtons()] });
                } else {
                  const { items } = paginate(allCategories, 0);
                  const menu = buildSelectMenu(items, "select_category", "اختر الفئة");
                  const pagRow = createPaginationRow(0, Math.ceil(allCategories.length / 25), "categories");
                  await componentInteraction.editReply({ components: [menu, pagRow] });
                }
              }
              break;

            case "advanced_select":
              if (value === "welcomeType") settings.welcomeType = settings.welcomeType === "embed" ? "message" : "embed";
              else if (value === "askReason") settings.askReason = !settings.askReason;
              await componentInteraction.editReply({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
              break;

            case "select_supportRole":
              settings.supportRoleId = value;
              paginationCache.roles.filtered = null;
              await componentInteraction.editReply({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
              break;

            case "select_category":
              settings.categoryId = value;
              paginationCache.categories.filtered = null;
              await componentInteraction.editReply({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
              break;

            case "select_buttonStyle":
              settings.buttonStyle = value;
              await componentInteraction.editReply({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
              break;

            default:
              await componentInteraction.editReply({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
          }
          continue;
        }

        if (componentInteraction.type === 5) {
          if (componentInteraction.customId === "modal_welcome") {
            const input = componentInteraction.fields.getTextInputValue("input");
            settings.welcomeMessage = input;
            try {
              await componentInteraction.update({ embeds: [generatePreviewEmbed()], components: [mainButtons()] });
            } catch {
              await componentInteraction.reply({ embeds: [generatePreviewEmbed()], components: [mainButtons()], ephemeral: true });
            }
            continue;
          }

          if (componentInteraction.customId.startsWith("modal_search_")) {
            const type = componentInteraction.customId.replace("modal_search_", "");
            const query = componentInteraction.fields.getTextInputValue("query").toLowerCase();
            const cache = paginationCache[type];
            const filtered = cache.items.filter(item => item.name.toLowerCase().includes(query));
            cache.filtered = filtered.length > 0 ? filtered : null;
            cache.page = 0;

            if (filtered.length === 0) {
              try {
                await componentInteraction.update({
                  components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back_to_main").setLabel("لم يتم العثور، رجوع").setEmoji(require('../../utils/emojis').folderopen.toString()).setStyle(ButtonStyle.Danger)
                  )],
                });
              } catch {
                await componentInteraction.reply({ content: "لم يتم العثور على نتائج.", ephemeral: true });
              }
              continue;
            }

            if (filtered.length <= 25) {
              const menu = buildSelectMenu(filtered, `select_${type}`, `اختر ${type === "roles" ? "الرتبة" : "الفئة"}`);
              await componentInteraction.update({ components: [menu, mainButtons()] }).catch(() => {});
            } else {
              const { items } = paginate(filtered, 0);
              const menu = buildSelectMenu(items, `select_${type}`, `اختر ${type === "roles" ? "الرتبة" : "الفئة"}`);
              const pagRow = createPaginationRow(0, Math.ceil(filtered.length / 25), type);
              await componentInteraction.update({ components: [menu, pagRow] }).catch(() => {});
            }
            continue;
          }
        }
      } catch (error) {
        console.error("خطأ في معالج إضافة الزر:", error);
        return interaction.editReply({
          components: [],
          embeds: [new EmbedBuilder().setColor("#FF0000").setDescription("{emoji:clock} انتهت مهلة الإعداد أو حدث خطأ.")],
        });
      }
    }

    const randomId = `ticket_${Math.random().toString(36).substr(2, 9)}`;
    const newButton = new ButtonBuilder()
      .setCustomId(randomId)
      .setLabel(settings.buttonName || "فتح تذكرة")
      .setStyle(ButtonStyle[settings.buttonStyle]);
    if (settings.buttonEmoji) newButton.setEmoji(settings.buttonEmoji);

    let finalMessage;
    try {
      finalMessage = await interaction.channel.messages.fetch(settings.targetMessageId);
    } catch {
      return interaction.editReply({
        components: [],
        embeds: [new EmbedBuilder().setColor("#FF0000").setDescription("{emoji:circlex} تعذر الوصول للرسالة، قد تكون حُذفت.")],
      });
    }

    // ========== التعديل هنا: إضافة الزر إلى نفس صف الأزرار الموجود إن أمكن ==========
    const existingComponents = finalMessage.components || [];
    let rows = [...existingComponents];

    // البحث عن أول صف يحتوي على مكون من نوع Button (type === 2)
    const existingButtonRowIndex = rows.findIndex(row =>
      row.components.some(component => component.type === 2)
    );

    if (existingButtonRowIndex !== -1) {
      // نحول الصف الموجود إلى Builder لإضافة الزر الجديد
      const targetRow = ActionRowBuilder.from(rows[existingButtonRowIndex]);
      if (targetRow.components.length < 5) {
        targetRow.addComponents(newButton);
        rows[existingButtonRowIndex] = targetRow;
      } else {
        // الصف ممتلئ، ننشئ صفاً جديداً للزر
        const newRow = new ActionRowBuilder().addComponents(newButton);
        rows.push(newRow);
      }
    } else {
      // لا يوجد صف أزرار، ننشئ صفاً جديداً
      const newRow = new ActionRowBuilder().addComponents(newButton);
      rows.push(newRow);
    }

    await finalMessage.edit({ components: rows });

    await keyValueService.set("ticketDB", `Ticket_${interaction.channel.id}_${randomId}`, {
      Support: settings.supportRoleId,
      Category: settings.categoryId,
      Internal: settings.welcomeMessage,
      Type: settings.welcomeType,
      Ask: settings.askReason ? "on" : "off",
    });

    await interaction.editReply({
      components: [],
      embeds: [new EmbedBuilder().setColor("#00FF00").setDescription("{emoji:circlecheck} تم إضافة زر التذكرة بنجاح إلى الرسالة المحددة.")],
    });
  },
};