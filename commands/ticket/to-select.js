const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
    EmbedBuilder
} = require('discord.js');

const keyValueService = require('../../services/keyValueService');

module.exports = {
    adminsOnly: true,

    data: new SlashCommandBuilder()
        .setName('to-select')
        .setDescription('تحويل التكت الى سلكت منيو')

        .addStringOption(option =>
            option
                .setName('message_id')
                .setDescription('ايدي الرسالة')
                .setRequired(true)
        )

        // اختيار القالب من القوالب المحفوظة (تم إزالة autocomplete)
        .addStringOption(option => {
            option
                .setName('template')
                .setDescription('اختر قالب الترحيب (سيتم عرض القوالب في خطوة منفصلة)')
                .setRequired(true)
                // .setAutocomplete(true);  // تم إزالة autocomplete

            return option;
        })

        .addStringOption(option =>
            option.setName('description1')
                .setDescription('وصف الخيار الأول')
                .setRequired(false)
        )

        .addStringOption(option =>
            option.setName('description2')
                .setDescription('وصف الخيار الثاني')
                .setRequired(false)
        )

        .addStringOption(option =>
            option.setName('description3')
                .setDescription('وصف الخيار الثالث')
                .setRequired(false)
        )

        .addStringOption(option =>
            option.setName('description4')
                .setDescription('وصف الخيار الرابع')
                .setRequired(false)
        )

        .addStringOption(option =>
            option.setName('description5')
                .setDescription('وصف الخيار الخامس')
                .setRequired(false)
        ),

    // تم إزالة دالة autocomplete بالكامل

    async execute(interaction) {

        const messageId = interaction.options.getString('message_id');

        // لن نستخدم template من الخيارات مباشرة، بل سنعرض قائمة منسدلة لاختيار القالب
        const descriptions = [
            interaction.options.getString('description1'),
            interaction.options.getString('description2'),
            interaction.options.getString('description3'),
            interaction.options.getString('description4'),
            interaction.options.getString('description5'),
        ];

        try {
            // جلب القوالب من قاعدة البيانات
            const templates = (await keyValueService.get('welcomeTemplates', interaction.guild.id)) || {};
            const templateNames = Object.keys(templates);

            if (templateNames.length === 0) {
                return interaction.reply({
                    content: '{emoji:circlex} لا توجد قوالب مسجلة. استخدم الأمر `/welcome-setup` أولاً.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            // بناء قائمة منسدلة لاختيار القالب (مثل طريقة setup-ticket)
            const selectOptions = [
                {
                    label: '{emoji:circlex} بدون قالب',
                    value: '__none__',
                    description: 'لن يتم استخدام أي قالب ترحيب',
                },
                ...templateNames.map(name => ({
                    label: name,
                    value: `template_${name}`,
                    description: `القالب: ${name}`,
                })),
            ];

            const templateSelect = new StringSelectMenuBuilder()
                .setCustomId('template_select_for_to_select')
                .setPlaceholder('{emoji:folder} اختر قالب الترحيب (أو بدون قالب)')
                .addOptions(selectOptions);

            const selectRow = new ActionRowBuilder().addComponents(templateSelect);

            // إرسال رسالة مؤقتة لاختيار القالب
            await interaction.reply({
                content: '**الخطوة 1 من 2:** اختر قالب الترحيب الذي تريد استخدامه مع التذاكر.',
                components: [selectRow],
                flags: MessageFlags.Ephemeral,
            });

            // انتظار اختيار المستخدم
            const filter = (i) => i.user.id === interaction.user.id && i.customId === 'template_select_for_to_select';
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                max: 1,
                time: 120000,
            });

            let selectedTemplate = null;
            let templateName = null;
            let isNone = false;

            await new Promise((resolve, reject) => {
                collector.on('collect', async (i) => {
                    const selectedValue = i.values[0];
                    if (selectedValue === '__none__') {
                        isNone = true;
                        selectedTemplate = null;
                        templateName = null;
                    } else {
                        templateName = selectedValue.replace('template_', '');
                        selectedTemplate = templates[templateName];
                    }
                    await i.deferUpdate();
                    resolve(i);
                });
                collector.on('end', (collected, reason) => {
                if (collected.size === 0) reject(new Error('انتهى الوقت'));
                });
            });

            // بعد اختيار القالب، نكمل العملية
            // جلب الرسالة
            const message = await interaction.channel.messages.fetch(messageId);

            // البحث عن صف الأزرار
            const buttonRow = message.components.find(row =>
                row.components.some(component => component.type === 2)
            );

            if (!buttonRow) {
                return interaction.editReply({
                    content: '{emoji:circlex} لا توجد أزرار في الرسالة.',
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // إنشاء السلكت منيو
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('اختر نوع التذكرة من هنا!');  // تم تعريبها

            // تحويل الأزرار إلى خيارات
            buttonRow.components.forEach((button, index) => {
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(button.label)
                    .setValue(button.customId);

                // الايموجي
                if (button.emoji) {
                    option.setEmoji(button.emoji);
                }

                // الوصف
                if (descriptions[index]) {
                    option.setDescription(descriptions[index]);
                }

                selectMenu.addOptions(option);
            });

            // زر الريسيت
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('إعادة تعيين')  // تم تعريبها
                    .setValue('reset')
                    .setEmoji(require('../../utils/emojis').clock.toString())  // تم إضافة إيموجي مناسب
            );

            // صف السلكت منيو
            const finalSelectRow = new ActionRowBuilder().addComponents(selectMenu);

            // تعديل الرسالة
            await message.edit({
                components: [finalSelectRow],
            });

            // حفظ القالب المختار إذا لم يكن "بدون قالب"
            if (!isNone && selectedTemplate) {
                await keyValueService.set(
                    'ticketSelectTemplate',
                    interaction.guild.id,
                    {
                        templateName,
                        template: selectedTemplate,
                    }
                );
            }

            // الرد النهائي
            let replyMessage = `{emoji:circlecheck} تم تحويل الأزرار إلى قائمة خيارات.`;
            if (!isNone && templateName) {
                replyMessage += `\n{emoji:folder} تم ربط القالب \`${templateName}\`.`;
            } else {
                replyMessage += `\n{emoji:circlex} لم يتم استخدام أي قالب ترحيب.`;
            }
            if (descriptions.some(d => d)) {
                replyMessage += `\n{emoji:message} تم إضافة الأوصاف بنجاح.`;
            }

            await interaction.editReply({
                content: replyMessage,
                components: [],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: '{emoji:circlex} حدث خطأ: تأكد من أنك تستخدم الأمر في نفس الروم الذي توجد فيه الرسالة، وحاول مرة أخرى.',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                return interaction.editReply({
                    content: '{emoji:circlex} حدث خطأ أو انتهت المهلة. حاول مرة أخرى.',
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }
};