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
    .setName("setup-ticket")
    .setDescription("إنشاء نظام تذاكر احترافي بتجربة تفاعلية"),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "{emoji:circlex} تحتاج إلى صلاحية الإدارة لاستخدام هذا الأمر.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // جلب قوالب الترحيب المخزنة (من أمر welcome-setup)
    const welcomeTemplates = (await keyValueService.get("welcomeTemplates", interaction.guild.id)) || {};

    const settings = {
      title: "نظام التذاكر",
      description: "اضغط الزر أدناه لفتح تذكرة",
      color: "#808080",
      buttonName: "فتح تذكرة",
      buttonStyle: "Primary",
      buttonEmoji: "",
      supportRoleId: null,
      categoryId: null,
      thumbnail: false,
      embedImage: "",
      welcomeMessage: "مرحباً بك في تذكرتك! سيقوم فريق الدعم بالرد عليك قريباً.",
      welcomeType: "embed",
      askReason: false,
      panelType: "embed", // "embed" أو "message"
    };

    // إعدادات إضافية للرسالة العادية
    const messageSettings = {
      content: settings.description, // النص الظاهر
      imageUrl: settings.embedImage, // رابط الصورة المرفقة
    };

    // دالة توليد الإيمبد للمعاينة (للنوع embed)
    const generatePreviewEmbed = () => {
      if (settings.panelType !== "embed") return null;
      return new EmbedBuilder()
        .setColor(settings.color)
        .setTitle(settings.title || null)
        .setDescription(settings.description || null)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()
        .setThumbnail(settings.thumbnail ? interaction.guild.iconURL() : null)
        .setImage(settings.embedImage || null);
    };

    // دالة بناء خيارات قسم المظهر حسب نوع اللوحة
    const getAdvancedOptions = () => {
      if (settings.panelType === "message") {
        return [
          { label: "نص الرسالة", value: "content", emoji: "💬" },
          { label: "رابط الصورة المرفقة", value: "imageUrl", emoji: "🖼️" },
          {
            label: `نوع رسالة الترحيب (${settings.welcomeType === "embed" ? "تضمين" : "نصية"})`,
            value: "welcomeType",
            emoji: "💬",
          },
          {
            label: `سؤال السبب ${settings.askReason ? "{emoji:circlecheck}" : "{emoji:circlex}"}`,
            value: "askReason",
            emoji: "ℹ️",
          },
          { label: "رسالة الترحيب", value: "welcomeMessage", emoji: "📧" },
        ];
      } else {
        return [
          { label: "عنوان البانر", value: "title", emoji: "🔖" },
          { label: "وصف البانر", value: "description", emoji: "💬" },
          { label: "لون التضمين", value: "color", emoji: "🖼️" },
          { label: "صورة البانر", value: "embedImage", emoji: "🖼️" },
          {
            label: `أيقونة السيرفر ${settings.thumbnail ? "{emoji:circlecheck}" : "{emoji:circlex}"}`,
            value: "thumbnail",
            emoji: "🖼️",
          },
          {
            label: `نوع رسالة الترحيب (${settings.welcomeType === "embed" ? "تضمين" : "نصية"})`,
            value: "welcomeType",
            emoji: "💬",
          },
          {
            label: `سؤال السبب ${settings.askReason ? "{emoji:circlecheck}" : "{emoji:circlex}"}`,
            value: "askReason",
            emoji: "ℹ️",
          },
          { label: "رسالة الترحيب", value: "welcomeMessage", emoji: "📧" },
        ];
      }
    };

    // دالة بناء الرد المناسب حسب النوع
    const buildReplyOptions = (extraComponents = []) => {
      const embed = generatePreviewEmbed();
      const comps = extraComponents.length > 0 ? extraComponents : [mainButtons()];
      const options = { components: comps };
      if (embed) {
        options.embeds = [embed];
        options.content = undefined;
      } else {
        // رسالة عادية: عرض النص ومعلومة عن الصورة إن وجدت
        let content = messageSettings.content || "اضغط الزر أدناه لفتح تذكرة";
        if (messageSettings.imageUrl) {
          content += `\n🖼️ صورة مرفقة: ${messageSettings.imageUrl}`;
        }
        options.content = content;
        options.embeds = [];
      }
      return options;
    };

    const mainButtons = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("edit_basics").setLabel("الإعدادات الأساسية").setEmoji(require('../../utils/emojis').settings.toString()).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("edit_advanced").setLabel("المظهر والرسالة").setEmoji(require('../../utils/emojis').star.toString()).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("send_panel").setLabel("تأكيد وإرسال").setEmoji(require('../../utils/emojis').bolt.toString()).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("cancel_setup").setLabel("إلغاء").setEmoji(require('../../utils/emojis').circlex.toString()).setStyle(ButtonStyle.Danger)
      );

    // الرد المبدئي
    const initialEmbed = generatePreviewEmbed();
    if (initialEmbed) {
      await interaction.reply({
        embeds: [initialEmbed.setFooter({ text: "{emoji:settings} معالج إعداد التذاكر | معاينة مباشرة" })],
        components: [mainButtons()],
        fetchReply: true,
      });
    } else {
      await interaction.reply({
        content: messageSettings.content || "اضغط الزر أدناه لفتح تذكرة",
        components: [mainButtons()],
        fetchReply: true,
      });
    }

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

    // حلقة التفاعل الرئيسية
    while (true) {
      try {
        const filter = (i) => i.user.id === interaction.user.id;
        const componentInteraction = await interaction.channel.awaitMessageComponent({
          filter,
          time: 900_000,
        });

        // --- الأزرار العامة ---
        if (componentInteraction.isButton()) {
          const btnId = componentInteraction.customId;
          switch (btnId) {
            case "cancel_setup":
              await componentInteraction.deferUpdate();
              return componentInteraction.editReply({
                components: [],
                embeds: [new EmbedBuilder().setColor("#FF0000").setDescription("{emoji:circlex} تم إلغاء عملية الإعداد.")],
              });

            case "send_panel": {
              const missing = [];
              if (!settings.supportRoleId) missing.push("رتبة الدعم");
              if (!settings.categoryId) missing.push("فئة القنوات");

              if (missing.length > 0) {
                await componentInteraction.deferUpdate();
                const msg =
                  missing.length === 2
                    ? `{emoji:alerttriangle}️ يجب اختيار ${missing.join(" و ")} قبل الإرسال.`
                    : `{emoji:alerttriangle}️ يجب اختيار ${missing[0]} قبل الإرسال.`;
                await componentInteraction.followUp({
                  content: msg,
                  flags: MessageFlags.Ephemeral,
                });
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
                    { label: "اسم الزر", value: "buttonName", emoji: "⚙️" },
                    { label: "لون الزر", value: "buttonStyle", emoji: "🖼️" },
                    { label: "إيموجي الزر", value: "buttonEmoji", emoji: "😊" },
                    { label: "رتبة الدعم", value: "supportRole", emoji: "👤" },
                    { label: "فئة القنوات", value: "category", emoji: "📂" },
                    { label: `نوع الرسالة (${settings.panelType === "embed" ? "تضمين" : "نصية"})`, value: "panelType", emoji: "📝" },
                  ])
              );
              await componentInteraction.editReply({ components: [row, mainButtons()] });
              continue;
            }

            case "edit_advanced": {
              await componentInteraction.deferUpdate();
              const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId("advanced_select")
                  .setPlaceholder("اختر العنصر لتعديله")
                  .addOptions(getAdvancedOptions())
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
                  await componentInteraction.editReply(buildReplyOptions());
                  continue;
                }

                const type = btnId.includes("roles") ? "roles" : "categories";
                const cache = paginationCache[type];
                let items = cache.filtered || cache.items;

                if (btnId.startsWith("search_")) {
                  const modal = new ModalBuilder()
                    .setCustomId(`modal_search_${type}`)
                    .setTitle(`بحث عن ${type === "roles" ? "رتبة" : "فئة"}`);
                  const input = new TextInputBuilder()
                    .setCustomId("query")
                    .setLabel("اكتب جزءاً من الاسم")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                  modal.addComponents(new ActionRowBuilder().addComponents(input));
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

        // --- القوائم المنسدلة ---
        if (componentInteraction.isStringSelectMenu()) {
          const value = componentInteraction.values[0];
          const customId = componentInteraction.customId;

          // قالب الترحيب
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
                    .setValue(
                      settings.welcomeMessage.startsWith("[template:") ? "" : settings.welcomeMessage
                    )
                )
              );
              await componentInteraction.showModal(modal);
              continue;
            } else {
              settings.welcomeMessage = `[template:${value}]`;
              await componentInteraction.deferUpdate();
              await componentInteraction.editReply(buildReplyOptions());
              continue;
            }
          }

          // خيارات تحتاج Modal (نفس القائمة السابقة مع إضافة content و imageUrl)
          const needsModal = ["buttonName", "buttonEmoji", "title", "description", "embedImage", "content", "imageUrl"];
          if (needsModal.includes(value)) {
            let modal;
            const currentValue = {
              buttonName: settings.buttonName,
              buttonEmoji: settings.buttonEmoji,
              title: settings.title,
              description: settings.description,
              embedImage: settings.embedImage,
              content: messageSettings.content,
              imageUrl: messageSettings.imageUrl,
            }[value];

            switch (value) {
              case "buttonName":
                modal = new ModalBuilder().setCustomId("modal_buttonName").setTitle("تغيير اسم الزر");
                modal.addComponents(new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("اسم الزر الجديد")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(currentValue)
                ));
                break;
              case "buttonEmoji":
                modal = new ModalBuilder().setCustomId("modal_buttonEmoji").setTitle("إضافة إيموجي للزر");
                modal.addComponents(new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("أدخل الإيموجي (اختياري)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(currentValue)
                ));
                break;
              case "title":
                modal = new ModalBuilder().setCustomId("modal_title").setTitle("تغيير العنوان");
                modal.addComponents(new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("عنوان البانر (اتركه فارغاً للإخفاء)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(currentValue)
                ));
                break;
              case "description":
                modal = new ModalBuilder().setCustomId("modal_description").setTitle("تغيير الوصف");
                modal.addComponents(new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("وصف البانر (اتركه فارغاً للإخفاء)")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setValue(currentValue)
                ));
                break;
              case "embedImage":
                modal = new ModalBuilder().setCustomId("modal_embedImage").setTitle("رابط صورة البانر");
                modal.addComponents(new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("رابط الصورة (اتركه فارغاً للحذف)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(currentValue)
                ));
                break;
              case "content":
                modal = new ModalBuilder().setCustomId("modal_content").setTitle("نص الرسالة");
                modal.addComponents(new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("النص الذي سيظهر في الرسالة العادية")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setValue(currentValue)
                ));
                break;
              case "imageUrl":
                modal = new ModalBuilder().setCustomId("modal_imageUrl").setTitle("رابط الصورة المرفقة");
                modal.addComponents(new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("رابط الصورة (اتركه فارغاً للحذف)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(currentValue)
                ));
                break;
            }
            await componentInteraction.showModal(modal);
            try {
              const modalSubmit = await componentInteraction.awaitModalSubmit({ time: 120_000 });
              const input = modalSubmit.fields.getTextInputValue("input");
              switch (modalSubmit.customId) {
                case "modal_buttonName": settings.buttonName = input; break;
                case "modal_buttonEmoji": settings.buttonEmoji = input; break;
                case "modal_title": settings.title = input; break;
                case "modal_description": settings.description = input; break;
                case "modal_embedImage": settings.embedImage = input; break;
                case "modal_content": messageSettings.content = input; settings.description = input; break;
                case "modal_imageUrl": messageSettings.imageUrl = input; settings.embedImage = input; break;
              }
              await modalSubmit.update(buildReplyOptions());
            } catch (error) {
              if (error.code === "INTERACTION_NOT_REPLIED") {
                await interaction.editReply({ components: [mainButtons()] });
              }
            }
            continue;
          }

          // اختيار welcomeMessage
          if (value === "welcomeMessage") {
            const templateNames = Object.keys(welcomeTemplates);
            const options = [];
            if (templateNames.length > 0) {
              templateNames.forEach(name => {
                options.push({ label: name, value: name, emoji: "📁" });
              });
            }
            options.push({
              label: "{emoji:adjustments}️ تخصيص يدوي (كتابة نص)",
              value: "__custom__",
              emoji: "⚙️",
            });

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
              } else if (value === "panelType") {
                settings.panelType = settings.panelType === "embed" ? "message" : "embed";
                // مزامنة القيم بين الوضعين
                if (settings.panelType === "message") {
                  messageSettings.content = settings.description;
                  messageSettings.imageUrl = settings.embedImage;
                } else {
                  settings.description = messageSettings.content;
                  settings.embedImage = messageSettings.imageUrl;
                }
                await componentInteraction.editReply(buildReplyOptions());
              }
              break;

            case "advanced_select":
              if (settings.panelType === "message") {
                if (value === "welcomeType") settings.welcomeType = settings.welcomeType === "embed" ? "message" : "embed";
                else if (value === "askReason") settings.askReason = !settings.askReason;
                // content و imageUrl عولجت مسبقاً في needsModal
                await componentInteraction.editReply(buildReplyOptions());
              } else {
                if (value === "thumbnail") settings.thumbnail = !settings.thumbnail;
                else if (value === "welcomeType") settings.welcomeType = settings.welcomeType === "embed" ? "message" : "embed";
                else if (value === "askReason") settings.askReason = !settings.askReason;
                else if (value === "color") {
                  const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                      .setCustomId("select_color")
                      .setPlaceholder("اختر لون التضمين")
                      .addOptions(embedColors.map(c => ({ label: c.name, value: c.value })))
                  );
                  await componentInteraction.editReply({ components: [row, mainButtons()] });
                  continue;
                }
                await componentInteraction.editReply(buildReplyOptions());
              }
              break;

            case "select_supportRole":
              settings.supportRoleId = value;
              paginationCache.roles.filtered = null;
              await componentInteraction.editReply(buildReplyOptions());
              break;

            case "select_category":
              settings.categoryId = value;
              paginationCache.categories.filtered = null;
              await componentInteraction.editReply(buildReplyOptions());
              break;

            case "select_buttonStyle":
              settings.buttonStyle = value;
              await componentInteraction.editReply(buildReplyOptions());
              break;

            case "select_color":
              settings.color = value;
              await componentInteraction.editReply(buildReplyOptions());
              break;

            default:
              await componentInteraction.editReply(buildReplyOptions());
          }
          continue;
        }

        // --- Modal الخاص بكتابة رسالة الترحيب اليدوية ---
        if (componentInteraction.type === 5 && componentInteraction.customId === "modal_welcome") {
          const input = componentInteraction.fields.getTextInputValue("input");
          settings.welcomeMessage = input;
          try {
            await componentInteraction.update(buildReplyOptions());
          } catch (e) {
            if (e.code === "INTERACTION_NOT_REPLIED") {
              await componentInteraction.reply({ ...buildReplyOptions(), ephemeral: true });
            }
          }
          continue;
        }

        // --- Modal البحث ---
        if (componentInteraction.type === 5 && componentInteraction.customId.startsWith("modal_search_")) {
          const type = componentInteraction.customId.replace("modal_search_", "");
          const query = componentInteraction.fields.getTextInputValue("query").toLowerCase();
          const cache = paginationCache[type];
          const allItems = cache.items;
          const filtered = allItems.filter(item => item.name.toLowerCase().includes(query));
          cache.filtered = filtered.length > 0 ? filtered : null;
          cache.page = 0;

          if (filtered.length === 0) {
            try {
              await componentInteraction.update({
                components: [
                  new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back_to_main").setLabel("لم يتم العثور، رجوع").setEmoji(require('../../utils/emojis').folderopen.toString()).setStyle(ButtonStyle.Danger)
                  ),
                ],
              });
            } catch (e) {
              if (e.code === "INTERACTION_NOT_REPLIED") {
                await componentInteraction.reply({
                  content: "لم يتم العثور على نتائج.",
                  ephemeral: true,
                });
              }
            }
            continue;
          }

          if (filtered.length <= 25) {
            const menu = buildSelectMenu(filtered, `select_${type}`, `اختر ${type === "roles" ? "الرتبة" : "الفئة"}`);
            try {
              await componentInteraction.update({ components: [menu, mainButtons()] });
            } catch (e) {
              if (e.code === "INTERACTION_NOT_REPLIED") {
                await componentInteraction.reply({ components: [menu, mainButtons()], ephemeral: true });
              }
            }
          } else {
            const { items } = paginate(filtered, 0);
            const menu = buildSelectMenu(items, `select_${type}`, `اختر ${type === "roles" ? "الرتبة" : "الفئة"}`);
            const pagRow = createPaginationRow(0, Math.ceil(filtered.length / 25), type);
            try {
              await componentInteraction.update({ components: [menu, pagRow] });
            } catch (e) {
              if (e.code === "INTERACTION_NOT_REPLIED") {
                await componentInteraction.reply({ components: [menu, pagRow], ephemeral: true });
              }
            }
          }
          continue;
        }

      } catch (error) {
        console.error("خطأ في معالج الإعداد:", error);
        return interaction.editReply({
          components: [],
          embeds: [new EmbedBuilder().setColor("#FF0000").setDescription("{emoji:clock} انتهت مهلة الإعداد أو حدث خطأ.")],
        });
      }
    }

    // إرسال اللوحة النهائية
    const randomId = `ticket_${Math.random().toString(36).substr(2, 9)}`;
    const btn = new ButtonBuilder()
      .setCustomId(randomId)
      .setLabel(settings.buttonName || "فتح تذكرة")
      .setStyle(ButtonStyle[settings.buttonStyle]);
    if (settings.buttonEmoji) btn.setEmoji(settings.buttonEmoji);

    const finalRow = new ActionRowBuilder().addComponents(btn);

    if (settings.panelType === "message") {
      const messagePayload = {
        content: messageSettings.content || "اضغط الزر أدناه لفتح تذكرة",
        components: [finalRow],
      };
      if (messageSettings.imageUrl) {
        // تحميل الصورة من الرابط وإرسالها كمرفق
        try {
          const fetch = (await import("node-fetch")).default;
          const response = await fetch(messageSettings.imageUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            messagePayload.files = [{ attachment: buffer, name: "image.png" }];
          }
        } catch (err) {
          console.error("فشل تحميل الصورة المرفقة:", err);
        }
      }
      await interaction.channel.send(messagePayload);
    } else {
      await interaction.channel.send({
        embeds: [generatePreviewEmbed()],
        components: [finalRow],
      });
    }

    await keyValueService.set("ticketDB", `Ticket_${interaction.channel.id}_${randomId}`, {
      Support: settings.supportRoleId,
      Category: settings.categoryId,
      Internal: settings.welcomeMessage,
      Type: settings.welcomeType,
      Ask: settings.askReason,
    });

    // أزرار الحفظ والإنهاء
    const saveRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("save_preset")
        .setLabel("حفظ الإعداد").setEmoji(require('../../utils/emojis').folderopen.toString())
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("finish_setup")
        .setLabel("إنهاء").setEmoji(require('../../utils/emojis').circlex.toString())
        .setStyle(ButtonStyle.Secondary)
    );

    const saveMessage = await interaction.followUp({
      components: [saveRow],
      embeds: [
        new EmbedBuilder()
          .setColor("#00FF00")
          .setDescription("{emoji:circlecheck} تم إنشاء نظام التذاكر بنجاح! يمكنك حفظ هذا الإعداد لاستخدامه لاحقاً."),
      ],
      ephemeral: true,
      fetchReply: true,
    });

    try {
      const saveFilter = (i) => i.user.id === interaction.user.id;
      const saveInteraction = await interaction.channel.awaitMessageComponent({
        filter: saveFilter,
        time: 120_000,
      });

      if (saveInteraction.customId === "save_preset") {
        const nameModal = new ModalBuilder()
          .setCustomId("modal_preset_name")
          .setTitle("تسمية الإعداد المسبق");

        const nameInput = new TextInputBuilder()
          .setCustomId("preset_name")
          .setLabel("أدخل اسماً مميزاً لهذا الإعداد")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100);

        nameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await saveInteraction.showModal(nameModal);

        const modalSubmit = await saveInteraction.awaitModalSubmit({ time: 60_000 });
        const presetName = modalSubmit.fields.getTextInputValue("preset_name").trim();

        const presets = (await keyValueService.get("ticketPresets", interaction.guild.id)) || {};
        presets[presetName] = {
          title: settings.title,
          description: settings.description,
          color: settings.color,
          buttonName: settings.buttonName,
          buttonStyle: settings.buttonStyle,
          buttonEmoji: settings.buttonEmoji,
          supportRoleId: settings.supportRoleId,
          categoryId: settings.categoryId,
          thumbnail: settings.thumbnail,
          embedImage: settings.embedImage,
          welcomeMessage: settings.welcomeMessage,
          welcomeType: settings.welcomeType,
          askReason: settings.askReason,
          panelType: settings.panelType,
          content: messageSettings.content,
          imageUrl: messageSettings.imageUrl,
        };
        await keyValueService.set("ticketPresets", interaction.guild.id, presets);

        await modalSubmit.reply({
          content: `{emoji:circlecheck} تم حفظ الإعداد المسبق باسم \`${presetName}\` بنجاح!`,
          flags: MessageFlags.Ephemeral,
        });
        await saveMessage.edit({
          components: [],
          embeds: [new EmbedBuilder().setColor("#00FF00").setDescription("{emoji:circlecheck} تم حفظ الإعداد.")],
        });
      } else {
        await saveInteraction.deferUpdate();
        await saveMessage.edit({
          components: [],
          embeds: [new EmbedBuilder().setColor("#00FF00").setDescription("{emoji:circlecheck} تم إنهاء الإعداد.")],
        });
      }
    } catch {
      await saveMessage.edit({
        components: [],
        embeds: [new EmbedBuilder().setColor("#00FF00").setDescription("{emoji:circlecheck} تم إنشاء نظام التذاكر.")],
      });
    }
  },
};