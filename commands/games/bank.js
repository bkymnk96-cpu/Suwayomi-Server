/**
 * أمر البنك — نسخة محسّنة ومطورة بالكامل (v2)
 * ------------------------------------------------------------
 * يدعم هذا الملف طريقتين للاستدعاء بنفس المنطق الأساسي (بدون تكرار كود):
 *   1) سلاش كوماند:  module.exports.execute(interaction)
 *   2) بريفكس كوماند: module.exports.run(message, args)
 *      حيث args = محتوى الرسالة بعد حذف البريفكس واسم الأمر، مقسّم بمسافات.
 *      مثال: "!bank job buy 3"  =>  args = ['job', 'buy', '3']
 *
 * كل المنطق موحّد داخل runBank(ctx) عبر كائن "ctx" يوحّد الفروقات بين
 * الـ Interaction والـ Message.
 *
 * الجديد في هذه النسخة:
 *   - أمر مساعدة (help) بتصميم احترافي مع سيلكت منيو للأقسام.
 *   - قوائم الوظائف والشركات أصبحت سيلكت منيو بدلاً من الأزرار.
 *   - متجر ممتلكات فاخرة جديد بالكامل (buy / شراء) مع 8 منتجات وأسعار
 *     متغيرة تلقائياً كل 30 دقيقة (أمر prices / اسعار لعرض التفاصيل).
 *   - أمر بيع (sell) موحّد بسيلكت منيو يعرض كل ما تملكه (منازل/شركات/منتجات).
 *   - أمر ممتلكات (assets) يجمع كل أصولك في مكان واحد.
 *   - أمر بروفايل يدعم عرض ملف أي عضو آخر مع صورته الرمزية.
 *   - كل ألوان الإيمبد موحّدة باللون الذهبي لهوية البوت.
 *
 * ملاحظة: تم الإبقاء حصراً على الإيموجيات المخصصة الموجودة أصلاً بصيغة
 * {emoji:xxx} ولم تتم إضافة أي إيموجي جديد أو عادي إطلاقاً — حتى في
 * القوائم والأزرار الجديدة (Discord لا يدعم هذه الصيغة خارج نص الإيمبد).
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');
const db = require('../../database/db');

/* ============================================================
 *  البيانات الأساسية
 * ============================================================ */

const jobTitles = [
  { name: 'ملك', cost: 50000, salary: 5000 },
  { name: 'امير', cost: 45000, salary: 4500 },
  { name: 'طيار', cost: 40000, salary: 4000 },
  { name: 'قاضي', cost: 35000, salary: 3500 },
  { name: 'مبرمج', cost: 30000, salary: 3000 },
  { name: 'دكتور', cost: 30000, salary: 3000 },
  { name: 'مهندس', cost: 25000, salary: 2500 },
  { name: 'معلم', cost: 20000, salary: 2000 },
  { name: 'جندي', cost: 15000, salary: 1500 },
  { name: 'طباخ', cost: 10000, salary: 1000 },
  { name: 'رسام', cost: 8000, salary: 800 },
];

const companiesData = [
  { id: 1, name: 'شركة النخبة', price: 100000000, rent: 50000000 },
  { id: 2, name: 'شركة ريال مدريد', price: 100000000, rent: 50000000 },
  { id: 3, name: 'شركة الأمل', price: 100000000, rent: 50000000 },
  { id: 4, name: 'شركة المستقبل', price: 100000000, rent: 50000000 },
  { id: 5, name: 'شركة الأمان', price: 100000000, rent: 50000000 },
  { id: 6, name: 'شركة السعادة', price: 100000000, rent: 50000000 },
  { id: 7, name: 'شركة الصقر', price: 100000000, rent: 50000000 },
  { id: 8, name: 'شركة النجوم', price: 100000000, rent: 50000000 },
  { id: 9, name: 'شركة الهلال', price: 100000000, rent: 50000000 },
  { id: 10, name: 'شركة الإعمار', price: 100000000, rent: 50000000 },
];

/** منتجات متجر الممتلكات الفاخرة — 8 منتجات بأسعار متدرجة */
const PRODUCTS = [
  { id: 1, name: 'دراجة هوائية', tag: 'اقتصادي', basePrice: 5000000 },
  { id: 2, name: 'دراجة نارية رياضية', tag: 'اقتصادي', basePrice: 15000000 },
  { id: 3, name: 'سيارة اقتصادية', tag: 'متوسط', basePrice: 40000000 },
  { id: 4, name: 'سيارة رياضية فاخرة', tag: 'متوسط', basePrice: 80000000 },
  { id: 5, name: 'يخت خاص', tag: 'فاخر', basePrice: 200000000 },
  { id: 6, name: 'طائرة خاصة', tag: 'فاخر', basePrice: 500000000 },
  { id: 7, name: 'جزيرة خاصة', tag: 'أسطوري', basePrice: 1000000000 },
  { id: 8, name: 'قصر ملكي', tag: 'أسطوري', basePrice: 2000000000 },
];

/** حدود تقلب أسعار المتجر: كل 30 دقيقة يتغير السعر ±15% ضمن نطاق 50%-180% من السعر الأساسي */
const PRICE_TICK_MS = 1800000; // 30 دقيقة
const PRICE_VOLATILITY = 0.15; // ±15% لكل تحديث
const PRICE_MAX_TICKS = 6; // حد أقصى للتراكم عند غياب طويل
const PRICE_LOWER_MULT = 0.5;
const PRICE_UPPER_MULT = 1.8;
const SELL_RATE_PRODUCT = 0.65; // نسبة استرجاع بيع منتجات المتجر

const RANKS = [
  { min: 0, name: 'مواطن عادي' },
  { min: 10000, name: 'تاجر مبتدئ' },
  { min: 100000, name: 'تاجر محترف' },
  { min: 1000000, name: 'رجل أعمال' },
  { min: 10000000, name: 'ثري معروف' },
  { min: 100000000, name: 'مليونير النخبة' },
  { min: 1000000000, name: 'إمبراطور المال' },
];

const ACHIEVEMENTS = [
  { id: 'first_daily', name: 'الخطوة الأولى', desc: 'استلمت الهدية اليومية لأول مرة' },
  { id: 'first_job', name: 'أول وظيفة', desc: 'اشتريت أول وظيفة لك' },
  { id: 'first_house', name: 'مالك عقار', desc: 'اشتريت أول منزل' },
  { id: 'company_owner', name: 'رجل أعمال', desc: 'امتلكت أول شركة استثمارية' },
  { id: 'debt_free', name: 'حر من الديون', desc: 'سددت قرضاً بنكياً بالكامل' },
  { id: 'successful_heist', name: 'اللص المحترف', desc: 'نجحت في سرقة عضو آخر' },
  { id: 'full_estate', name: 'إمبراطورية عقارية', desc: 'امتلكت 5 منازل دفعة واحدة' },
  { id: 'jackpot', name: 'الحظ الأكبر', desc: 'ربحت الجائزة الكبرى في السلوتس' },
  { id: 'millionaire', name: 'المليونير', desc: 'وصل صافي ثروتك إلى مليون دولار' },
  { id: 'tycoon', name: 'إمبراطور المال', desc: 'وصل صافي ثروتك إلى مليار دولار' },
  { id: 'first_purchase', name: 'مقتني فاخر', desc: 'اقتنيت أول منتج من متجر الممتلكات الفاخرة' },
  { id: 'collector', name: 'جامع الثروات', desc: 'امتلكت جميع منتجات متجر الممتلكات الفاخرة مرة واحدة' },
];

const SLOT_SYMBOLS = ['[7]', '[جرس]', '[نجمة]', '[كرز]', '[BAR]'];

const AMOUNT_KEYWORDS = ['all', 'الكل', 'max', 'كل', 'الكل كامل'];

// لون ذهبي موحّد لكل إيمبدات نظام البنك (هوية البوت)
const COLOR = 0xffd700;
const COLOR_ERROR = 0xe74c3c;
const COLOR_WIN = 0x2ecc71;

/* ============================================================
 *  أدوات مساعدة عامة
 * ============================================================ */

const fmt = (n) => `$${Math.max(0, Math.floor(n)).toLocaleString('en-US')}`;

function getRank(netWorth) {
  let current = RANKS[0];
  for (const r of RANKS) if (netWorth >= r.min) current = r;
  return current.name;
}

function nextRank(netWorth) {
  for (const r of RANKS) if (netWorth < r.min) return r;
  return null;
}

function parseAmount(raw, available) {
  if (raw === null || raw === undefined || raw === '') {
    return { error: 'يرجى تحديد المبلغ المطلوب.' };
  }
  const clean = String(raw).trim().toLowerCase();
  if (AMOUNT_KEYWORDS.includes(clean)) {
    if (available <= 0) return { error: 'لا يوجد رصيد كافٍ لتنفيذ هذا الإجراء.' };
    return { value: available };
  }
  const num = parseInt(clean.replace(/[,$\s]/g, ''), 10);
  if (isNaN(num) || num <= 0) {
    return { error: 'المبلغ المدخل غير صحيح، أدخل رقماً صحيحاً أو اكتب "all" لتحديد الكل.' };
  }
  return { value: num };
}

function findJob(query) {
  if (!query) return null;
  const q = String(query).trim();
  const asNum = parseInt(q, 10);
  if (!isNaN(asNum) && String(asNum) === q && asNum >= 1 && asNum <= jobTitles.length) {
    return jobTitles[asNum - 1];
  }
  let job = jobTitles.find((j) => j.name === q);
  if (job) return job;
  job = jobTitles.find((j) => j.name.startsWith(q) || q.startsWith(j.name));
  return job || null;
}

function formatRemaining(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h} ساعة و ${m} دقيقة`;
  if (m > 0) return `${m} دقيقة و ${s} ثانية`;
  return `${s} ثانية`;
}

function errorEmbed(text) {
  return new EmbedBuilder().setDescription(`{emoji:circlex} ${text}`).setColor(COLOR_ERROR);
}

function cooldownEmbed(text, ms) {
  return new EmbedBuilder()
    .setDescription(`{emoji:clock} ${text}\nالوقت المتبقي: **${formatRemaining(ms)}**`)
    .setColor(COLOR_ERROR);
}

/* ============================================================
 *  طبقة قاعدة البيانات (محفظة / خزنة / إنجازات)
 * ============================================================ */

async function getWallet(userId) {
  return (await db.getKV(`balance_${userId}`)) || 0;
}
async function setWallet(userId, value) {
  await db.setKV(`balance_${userId}`, Math.max(0, Math.floor(value)));
}
async function getVault(userId) {
  return (await db.getKV(`vault_${userId}`)) || 0;
}
async function setVault(userId, value) {
  await db.setKV(`vault_${userId}`, Math.max(0, Math.floor(value)));
}

/** يحسب فوائد الخزنة الآمنة تلقائياً بناءً على الوقت المنقضي (0.5% كل ساعة، بحد أقصى 72 ساعة تراكمية) */
async function accrueInterest(userId) {
  const vault = await getVault(userId);
  if (vault <= 0) {
    await db.setKV(`vault_time_${userId}`, Date.now());
    return 0;
  }
  const lastTime = (await db.getKV(`vault_time_${userId}`)) || Date.now();
  const now = Date.now();
  const hoursPassed = (now - lastTime) / 3600000;
  if (hoursPassed < 1) return 0;
  const rate = 0.005;
  const effectiveHours = Math.min(hoursPassed, 72);
  const interest = Math.floor(vault * rate * effectiveHours);
  await db.setKV(`vault_time_${userId}`, now);
  if (interest > 0) {
    await setVault(userId, vault + interest);
  }
  return interest;
}

async function unlockAchievement(userId, id) {
  const raw = await db.getKV(`achievements_${userId}`);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch {
    list = [];
  }
  if (!list.includes(id)) {
    list.push(id);
    await db.setKV(`achievements_${userId}`, JSON.stringify(list));
    return true;
  }
  return false;
}

async function getAchievements(userId) {
  const raw = await db.getKV(`achievements_${userId}`);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** يفحص إنجازات الثروة (مليونير / إمبراطور المال) ويرجع قائمة الإنجازات الجديدة المفتوحة */
async function checkNetWorthAchievements(userId, netWorth) {
  const unlocked = [];
  if (netWorth >= 1000000 && (await unlockAchievement(userId, 'millionaire'))) unlocked.push('millionaire');
  if (netWorth >= 1000000000 && (await unlockAchievement(userId, 'tycoon'))) unlocked.push('tycoon');
  return unlocked;
}

function achievementFooter(unlockedIds) {
  if (!unlockedIds || unlockedIds.length === 0) return null;
  const names = unlockedIds
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join('، ');
  return `{emoji:trophy} إنجاز جديد: ${names}`;
}

/* ============================================================
 *  طبقة متجر الممتلكات الفاخرة (منتجات + أسعار متغيرة)
 * ============================================================ */

async function getUserProducts(userId) {
  const raw = await db.getKV(`user_products_${userId}`);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
async function setUserProducts(userId, obj) {
  await db.setKV(`user_products_${userId}`, JSON.stringify(obj));
}

/**
 * يحسب السعر الحالي لمنتج معيّن ويحدّثه تلقائياً كل 30 دقيقة (صعوداً أو هبوطاً)
 * ضمن نطاق محدود، ويحتفظ بأدنى وأعلى سعر وصل له المنتج على الإطلاق.
 */
async function getProductPrice(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;
  const now = Date.now();

  let price = await db.getKV(`product_price_${productId}`);
  let lastUpdate = await db.getKV(`product_price_time_${productId}`);
  let min = await db.getKV(`product_min_${productId}`);
  let max = await db.getKV(`product_max_${productId}`);

  if (price === null || price === undefined) {
    price = product.basePrice;
    lastUpdate = now;
    min = product.basePrice;
    max = product.basePrice;
    await db.setKV(`product_price_${productId}`, price);
    await db.setKV(`product_price_time_${productId}`, lastUpdate);
    await db.setKV(`product_min_${productId}`, min);
    await db.setKV(`product_max_${productId}`, max);
    return { price, min, max, base: product.basePrice };
  }

  const ticksPassed = Math.floor((now - lastUpdate) / PRICE_TICK_MS);
  if (ticksPassed > 0) {
    const ticks = Math.min(ticksPassed, PRICE_MAX_TICKS);
    const lowerBound = Math.floor(product.basePrice * PRICE_LOWER_MULT);
    const upperBound = Math.floor(product.basePrice * PRICE_UPPER_MULT);
    for (let i = 0; i < ticks; i++) {
      const changePct = (Math.random() * (PRICE_VOLATILITY * 2)) - PRICE_VOLATILITY;
      price = Math.floor(price * (1 + changePct));
      price = Math.min(upperBound, Math.max(lowerBound, price));
    }
    min = Math.min(min ?? price, price);
    max = Math.max(max ?? price, price);
    lastUpdate = now;
    await db.setKV(`product_price_${productId}`, price);
    await db.setKV(`product_price_time_${productId}`, lastUpdate);
    await db.setKV(`product_min_${productId}`, min);
    await db.setKV(`product_max_${productId}`, max);
  }

  return { price, min, max, base: product.basePrice };
}

/* ============================================================
 *  إعداد أمر السلاش
 * ============================================================ */

const data = new SlashCommandBuilder()
  .setName('bank')
  .setDescription('نظام البنك والألعاب المالية')
  .addSubcommand((sub) => sub.setName('balance').setDescription('عرض رصيدك المالي ورتبتك البنكية'))
  .addSubcommand((sub) => sub.setName('daily').setDescription('الحصول على الهدية اليومية'))
  .addSubcommand((sub) => sub.setName('weekly').setDescription('الحصول على الهدية الأسبوعية الكبرى'))
  .addSubcommand((sub) =>
    sub
      .setName('deposit')
      .setDescription('إيداع أموال في الخزنة الآمنة (محمية من السرقة وتربح فوائد)')
      .addStringOption((opt) =>
        opt.setName('amount').setDescription('المبلغ أو "all" لإيداع كل رصيدك').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('withdraw')
      .setDescription('سحب أموال من الخزنة الآمنة إلى محفظتك')
      .addStringOption((opt) =>
        opt.setName('amount').setDescription('المبلغ أو "all" لسحب كل الخزنة').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('transfer')
      .setDescription('تحويل مبلغ مالي لشخص آخر')
      .addUserOption((opt) => opt.setName('user').setDescription('الشخص المراد التحويل له').setRequired(true))
      .addStringOption((opt) =>
        opt.setName('amount').setDescription('المبلغ أو "all" لتحويل كل رصيدك').setRequired(true)
      )
  )
  .addSubcommand((sub) => sub.setName('salary').setDescription('استلام الراتب والمداخيل العقارية والاستثمارية'))
  .addSubcommand((sub) =>
    sub
      .setName('job')
      .setDescription('العمل واختيار الوظائف')
      .addStringOption((opt) =>
        opt
          .setName('action')
          .setDescription('الإجراء المطلوب')
          .setRequired(true)
          .addChoices(
            { name: 'عرض قائمة الوظائف', value: 'list' },
            { name: 'شراء وظيفة جديدة', value: 'buy' },
            { name: 'عرض وظيفتي الحالية', value: 'current' }
          )
      )
      .addStringOption((opt) =>
        opt.setName('name').setDescription('اسم أو رقم الوظيفة المراد شراءها').setRequired(false)
      )
  )
  .addSubcommand((sub) => sub.setName('loan').setDescription('أخذ قرض مالي من البنك'))
  .addSubcommand((sub) => sub.setName('payloan').setDescription('تسديد القرض الحالي المتبقي عليك'))
  .addSubcommand((sub) =>
    sub
      .setName('invest')
      .setDescription('استثمار أموالك في البورصة')
      .addIntegerOption((opt) =>
        opt.setName('amount').setDescription('المبلغ المراد استثماره').setRequired(true).setMinValue(100)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('trade')
      .setDescription('تداول العملات والأسهم')
      .addIntegerOption((opt) =>
        opt.setName('amount').setDescription('المبلغ المراد تداوله').setRequired(true).setMinValue(100)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('buy')
      .setDescription('فتح متجر الممتلكات الفاخرة، أو شراء منزل/شركة مباشرة')
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('اتركه فارغاً لفتح متجر الممتلكات الفاخرة')
          .setRequired(false)
          .addChoices(
            { name: 'شراء منزل ($1,000,000)', value: 'house' },
            { name: 'شراء شركة ($100,000,000)', value: 'company' }
          )
      )
      .addIntegerOption((opt) =>
        opt.setName('id').setDescription('رقم الشركة (فقط للشركات)').setRequired(false).setMinValue(1).setMaxValue(10)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('sell')
      .setDescription('بيع منزل أو شركة أو منتج تملكه')
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('اتركه فارغاً لعرض كل ممتلكاتك القابلة للبيع')
          .setRequired(false)
          .addChoices({ name: 'بيع منزل', value: 'house' }, { name: 'بيع شركة', value: 'company' })
      )
      .addIntegerOption((opt) =>
        opt.setName('id').setDescription('رقم الشركة (فقط للشركات)').setRequired(false).setMinValue(1).setMaxValue(10)
      )
  )
  .addSubcommand((sub) => sub.setName('companies').setDescription('عرض قائمة الشركات الاستثمارية وحالتها'))
  .addSubcommand((sub) => sub.setName('prices').setDescription('عرض أسعار متجر الممتلكات الفاخرة الحالية'))
  .addSubcommand((sub) => sub.setName('assets').setDescription('عرض جميع ممتلكاتك (منازل، شركات، منتجات المتجر)'))
  .addSubcommandGroup((group) =>
    group
      .setName('games')
      .setDescription('ألعاب الحظ (مقامرة، نرد، عملة، سلوتس)')
      .addSubcommand((sub) =>
        sub
          .setName('gamble')
          .setDescription('المقامرة بمبلغ مالي')
          .addStringOption((opt) =>
            opt.setName('amount').setDescription('المبلغ أو "all"').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('dice')
          .setDescription('لعبة رمي النرد')
          .addStringOption((opt) =>
            opt.setName('amount').setDescription('المبلغ أو "all"').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('coinflip')
          .setDescription('لعبة رمي العملة المعدنية')
          .addStringOption((opt) =>
            opt.setName('amount').setDescription('المبلغ أو "all"').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('slots')
          .setDescription('ماكينة القمار (السلوتس)')
          .addStringOption((opt) =>
            opt.setName('amount').setDescription('المبلغ أو "all"').setRequired(true)
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('rob')
      .setDescription('محاولة نهب وسرقة رصيد عضو آخر')
      .addUserOption((opt) => opt.setName('user').setDescription('العضو المراد سرقته').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('protect')
      .setDescription('شراء درع حماية لحماية حسابك من السرقة والنهب')
      .addIntegerOption((opt) =>
        opt.setName('hours').setDescription('عدد الساعات (سعر الساعة $500,000 بحد أقصى 3 ساعات)').setRequired(true).setMinValue(1).setMaxValue(3)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('profile')
      .setDescription('عرض ملفك الشخصي المالي الكامل أو ملف عضو آخر')
      .addUserOption((opt) => opt.setName('user').setDescription('العضو المراد عرض ملفه').setRequired(false))
  )
  .addSubcommand((sub) => sub.setName('achievements').setDescription('عرض إنجازاتك البنكية'))
  .addSubcommand((sub) => sub.setName('top').setDescription('عرض قائمة أغنى الأعضاء في السيرفر'))
  .addSubcommand((sub) => sub.setName('help').setDescription('عرض دليل استخدام نظام البنك بالكامل'));

/* ============================================================
 *  مخطط أوامر البريفكس (لتفسير args بشكل صحيح لكل أمر فرعي)
 * ============================================================ */

const PREFIX_SPECS = {
  transfer: [{ name: 'user', type: 'user' }, { name: 'amount', type: 'string' }],
  deposit: [{ name: 'amount', type: 'string' }],
  withdraw: [{ name: 'amount', type: 'string' }],
  job: [{ name: 'action', type: 'string' }, { name: 'name', type: 'string', rest: true }],
  invest: [{ name: 'amount', type: 'string' }],
  trade: [{ name: 'amount', type: 'string' }],
  buy: [{ name: 'type', type: 'string' }, { name: 'id', type: 'string' }],
  sell: [{ name: 'type', type: 'string' }, { name: 'id', type: 'string' }],
  gamble: [{ name: 'amount', type: 'string' }],
  dice: [{ name: 'amount', type: 'string' }],
  coinflip: [{ name: 'amount', type: 'string' }],
  slots: [{ name: 'amount', type: 'string' }],
  rob: [{ name: 'user', type: 'user' }],
  protect: [{ name: 'hours', type: 'string' }],
  profile: [{ name: 'user', type: 'user' }],
};

// أسماء بديلة عربية مقبولة للأمر الفرعي عند استخدام البريفكس
const SUBCOMMAND_ALIASES = {
  رصيد: 'balance',
  يومي: 'daily',
  اسبوعي: 'weekly',
  أسبوعي: 'weekly',
  ايداع: 'deposit',
  إيداع: 'deposit',
  سحب: 'withdraw',
  تحويل: 'transfer',
  راتب: 'salary',
  وظيفة: 'job',
  قرض: 'loan',
  سداد: 'payloan',
  تسديد: 'payloan',
  استثمار: 'invest',
  تداول: 'trade',
  شراء: 'buy',
  بيع: 'sell',
  شركات: 'companies',
  اسعار: 'prices',
  أسعار: 'prices',
  ممتلكات: 'assets',
  مقتنيات: 'assets',
  مقامرة: 'gamble',
  نرد: 'dice',
  عملة: 'coinflip',
  سلوتس: 'slots',
  سرقة: 'rob',
  نهب: 'rob',
  حماية: 'protect',
  ملف: 'profile',
  بروفايل: 'profile',
  انجازات: 'achievements',
  إنجازات: 'achievements',
  الاثرياء: 'top',
  الأثرياء: 'top',
  مساعدة: 'help',
};

async function buildCtxFromMessage(message, argsRaw) {
  const args = [...argsRaw];
  let subRaw = (args.shift() || '').toLowerCase();
  const subcommand = SUBCOMMAND_ALIASES[subRaw] || subRaw;
  const spec = PREFIX_SPECS[subcommand] || [];
  const parsed = {};
  let idx = 0;

  for (const field of spec) {
    if (field.rest) {
      parsed[field.name] = args.slice(idx).join(' ') || null;
      idx = args.length;
      continue;
    }
    const token = args[idx];
    if (field.type === 'user') {
      let user = message.mentions.users.first();
      if (!user && token) {
        const id = token.replace(/[<@!>]/g, '');
        user = await message.client.users.fetch(id).catch(() => null);
      }
      parsed[field.name] = user || null;
    } else {
      parsed[field.name] = token !== undefined ? token : null;
    }
    idx++;
  }

  return {
    isPrefix: true,
    userId: message.author.id,
    userTag: message.author,
    guildId: message.guildId,
    channelId: message.channelId,
    channel: message.channel,
    subcommand,
    getString: (n) => (parsed[n] !== undefined ? parsed[n] : null),
    getInteger: (n) => (parsed[n] ? parseInt(parsed[n], 10) : null),
    getUser: (n) => parsed[n] || null,
    reply: async (payload) => {
      try {
        return await message.reply(payload);
      } catch {
        return message.channel.send(payload);
      }
    },
    raw: message,
  };
}

function buildCtxFromInteraction(interaction) {
  return {
    isPrefix: false,
    userId: interaction.user.id,
    userTag: interaction.user,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    channel: interaction.channel,
    subcommand: interaction.options.getSubcommand(),
    getString: (n) => interaction.options.getString(n),
    getInteger: (n) => interaction.options.getInteger(n),
    getUser: (n) => interaction.options.getUser(n),
    reply: async (payload) => interaction.reply(payload),
    raw: interaction,
  };
}

/* ============================================================
 *  المنطق الأساسي الموحّد لجميع الأوامر الفرعية
 * ============================================================ */

async function runBank(ctx) {
  const userId = ctx.userId;

  // تحقق من روم البنك المخصص (إن وُجد)
  if (ctx.guildId) {
    const guildSettings = db.getGuildSettings(ctx.guildId);
    const bankChannelId = guildSettings ? guildSettings.bank_channel : null;
    if (bankChannelId && ctx.channelId !== bankChannelId) {
      return ctx.reply({
        embeds: [errorEmbed(`لا يمكنك استخدام أوامر البنك خارج الروم المخصص: <#${bankChannelId}>`)],
      });
    }
  }

  // استقطاع تلقائي للقرض المنتهي
  const loanRepayTime = await db.getKV(`loan_repay_${userId}`);
  if (loanRepayTime && Date.now() > loanRepayTime) {
    const outstandingLoan = await db.getKV(`loan_${userId}`);
    if (outstandingLoan) {
      let wallet = await getWallet(userId);
      wallet = Math.max(0, wallet - outstandingLoan);
      await setWallet(userId, wallet);
      await db.deleteKV(`loan_${userId}`);
      await db.deleteKV(`loan_repay_${userId}`);
      await ctx.channel
        .send({
          content: `{emoji:alerttriangle} <@${userId}> تم استقطاع مبلغ القرض التلقائي المتبقي بقيمة ${fmt(
            outstandingLoan
          )} من حسابك لانتهاء مدة السداد.`,
        })
        .catch(() => null);
    }
  }

  // فوائد الخزنة الآمنة (تُحسب في كل استخدام)
  const interestGained = await accrueInterest(userId);

  const sub = ctx.subcommand;

  switch (sub) {
    case 'balance':
      return cmdBalance(ctx, interestGained);
    case 'daily':
      return cmdDaily(ctx);
    case 'weekly':
      return cmdWeekly(ctx);
    case 'deposit':
      return cmdDeposit(ctx);
    case 'withdraw':
      return cmdWithdraw(ctx);
    case 'transfer':
      return cmdTransfer(ctx);
    case 'salary':
      return cmdSalary(ctx);
    case 'job':
      return cmdJob(ctx);
    case 'loan':
      return cmdLoan(ctx);
    case 'payloan':
      return cmdPayLoan(ctx);
    case 'invest':
      return cmdInvestTrade(ctx, 'invest', 0.1, 3600000, 'استثمار', 'الاستثمار');
    case 'trade':
      return cmdInvestTrade(ctx, 'trade', 0.15, 3600000, 'تداول', 'التداول');
    case 'buy':
      return cmdBuy(ctx);
    case 'sell':
      return cmdSell(ctx);
    case 'companies':
      return cmdCompanies(ctx);
    case 'prices':
      return cmdPrices(ctx);
    case 'assets':
      return cmdAssets(ctx);
    case 'gamble':
      return cmdGamble(ctx);
    case 'dice':
      return cmdDice(ctx);
    case 'coinflip':
      return cmdCoinflip(ctx);
    case 'slots':
      return cmdSlots(ctx);
    case 'rob':
      return cmdRob(ctx);
    case 'protect':
      return cmdProtect(ctx);
    case 'profile':
      return cmdProfile(ctx);
    case 'achievements':
      return cmdAchievements(ctx);
    case 'top':
      return cmdTop(ctx);
    case 'help':
      return cmdHelp(ctx);
    default:
      return ctx.reply({
        embeds: [errorEmbed('أمر فرعي غير معروف. استخدم `help` لعرض كل الأوامر المتاحة.')],
      });
  }
}

/* ---------------------- الرصيد والملف الشخصي ---------------------- */

async function cmdBalance(ctx, interestGained) {
  const wallet = await getWallet(ctx.userId);
  const vault = await getVault(ctx.userId);
  const netWorth = wallet + vault;
  const rank = getRank(netWorth);

  const embed = new EmbedBuilder()
    .setTitle('{emoji:briefcase} الحساب البنكي')
    .setDescription(`مرحباً <@${ctx.userId}>، إليك بيانات حسابك المالي:`)
    .addFields(
      { name: '{emoji:gift} المحفظة (قابلة للسرقة)', value: fmt(wallet), inline: true },
      { name: '{emoji:shield} الخزنة الآمنة', value: fmt(vault), inline: true },
      { name: '{emoji:chartpie} صافي الثروة', value: fmt(netWorth), inline: true },
      { name: '{emoji:crown} رتبتك البنكية', value: rank, inline: false }
    )
    .setColor(COLOR)
    .setTimestamp();

  if (interestGained > 0) {
    embed.setFooter({ text: `تمت إضافة ${fmt(interestGained)} كفوائد على خزنتك الآمنة` });
  }

  const unlocked = await checkNetWorthAchievements(ctx.userId, netWorth);
  const footer = achievementFooter(unlocked);
  if (footer && !interestGained) embed.setFooter({ text: footer });

  return ctx.reply({ embeds: [embed] });
}

async function cmdProfile(ctx) {
  const targetUser = ctx.getUser('user') || ctx.userTag;
  const targetId = targetUser?.id || ctx.userId;
  const isSelf = targetId === ctx.userId;

  const wallet = await getWallet(targetId);
  const vault = await getVault(targetId);
  const netWorth = wallet + vault;
  const rank = getRank(netWorth);
  const next = nextRank(netWorth);
  const job = (await db.getKV(`job_${targetId}`)) || 'بدون وظيفة';
  const houses = (await db.getKV(`user_houses_${targetId}`)) || 0;
  const loan = (await db.getKV(`loan_${targetId}`)) || 0;
  const shield = (await db.getKV(`shield_${targetId}`)) || 0;
  const achievements = await getAchievements(targetId);

  const ownedCompanies = [];
  for (const comp of companiesData) {
    const owner = await db.getKV(`company_${comp.id}_owner`);
    if (owner === targetId) ownedCompanies.push(comp.name);
  }

  const products = await getUserProducts(targetId);
  let productCount = 0;
  for (const product of PRODUCTS) productCount += products[product.id] || 0;

  const shieldActive = shield && Date.now() < shield;

  const displayName = targetUser?.username || 'عضو';

  const embed = new EmbedBuilder()
    .setTitle(isSelf ? '{emoji:user} ملفك الشخصي المالي' : `{emoji:user} الملف الشخصي المالي — ${displayName}`)
    .setDescription(isSelf ? `مرحباً <@${targetId}>، إليك ملفك المالي الكامل:` : `إليك الملف المالي الخاص بـ <@${targetId}>:`)
    .setColor(COLOR)
    .setThumbnail(targetUser?.displayAvatarURL ? targetUser.displayAvatarURL({ size: 256 }) : null)
    .addFields(
      { name: '{emoji:crown} الرتبة', value: rank, inline: true },
      { name: '{emoji:briefcase} الوظيفة', value: job, inline: true },
      { name: '{emoji:trophy} الإنجازات', value: `${achievements.length}/${ACHIEVEMENTS.length}`, inline: true },
      { name: '{emoji:gift} المحفظة', value: fmt(wallet), inline: true },
      { name: '{emoji:shield} الخزنة الآمنة', value: fmt(vault), inline: true },
      { name: '{emoji:chartpie} صافي الثروة', value: fmt(netWorth), inline: true },
      { name: '{emoji:briefcase} المنازل المملوكة', value: `${houses}/5`, inline: true },
      { name: '{emoji:crown} منتجات المتجر الفاخر', value: `${productCount} قطعة`, inline: true },
      { name: '{emoji:alerttriangle} القرض الحالي', value: loan ? fmt(loan) : 'لا يوجد', inline: true },
      { name: '{emoji:chartpie} الشركات المملوكة', value: ownedCompanies.length ? ownedCompanies.join('، ') : 'لا يوجد', inline: false },
      { name: '{emoji:shield} درع الحماية', value: shieldActive ? `نشط حتى <t:${Math.floor(shield / 1000)}:R>` : 'غير مفعّل', inline: true }
    )
    .setTimestamp();

  if (next) {
    embed.setFooter({ text: `تحتاج ${fmt(next.min - netWorth)} إضافية للوصول إلى رتبة "${next.name}"` });
  } else {
    embed.setFooter({ text: 'لقد وصلت إلى أعلى رتبة بنكية ممكنة!' });
  }

  return ctx.reply({ embeds: [embed] });
}

async function cmdAchievements(ctx) {
  const unlocked = await getAchievements(ctx.userId);
  const embed = new EmbedBuilder()
    .setTitle('{emoji:trophy} إنجازاتك البنكية')
    .setDescription(`لقد حققت **${unlocked.length}/${ACHIEVEMENTS.length}** إنجاز.`)
    .setColor(COLOR);

  for (const a of ACHIEVEMENTS) {
    const done = unlocked.includes(a.id);
    embed.addFields({
      name: `${done ? '{emoji:circlecheck}' : '{emoji:circlex}'} ${a.name}`,
      value: a.desc,
      inline: true,
    });
  }

  return ctx.reply({ embeds: [embed] });
}

/** أمر ممتلكات — يجمع كل أصول العضو (منازل، شركات، منتجات المتجر) في مكان واحد */
async function cmdAssets(ctx) {
  const houses = (await db.getKV(`user_houses_${ctx.userId}`)) || 0;

  const ownedCompanies = [];
  for (const comp of companiesData) {
    const owner = await db.getKV(`company_${comp.id}_owner`);
    if (owner === ctx.userId) ownedCompanies.push(comp);
  }

  const productsOwned = await getUserProducts(ctx.userId);
  const ownedProducts = [];
  let productsValue = 0;
  for (const product of PRODUCTS) {
    const qty = productsOwned[product.id] || 0;
    if (qty > 0) {
      const { price } = await getProductPrice(product.id);
      ownedProducts.push({ product, qty, price });
      productsValue += price * qty;
    }
  }

  const houseValue = houses * 1000000;
  const companiesValue = ownedCompanies.reduce((s, c) => s + c.price, 0);
  const totalValue = houseValue + companiesValue + productsValue;

  const embed = new EmbedBuilder()
    .setTitle('{emoji:briefcase} ممتلكاتي')
    .setDescription(`مرحباً <@${ctx.userId}>، إليك جميع ما تملكه من ممتلكات وأصول:`)
    .setColor(COLOR)
    .addFields(
      {
        name: '{emoji:gift} المنازل',
        value: houses > 0 ? `${houses}/5 منزل — القيمة التقريبية: **${fmt(houseValue)}**` : 'لا تملك أي منزل حالياً.',
        inline: false,
      },
      {
        name: '{emoji:chartpie} الشركات المملوكة',
        value: ownedCompanies.length
          ? ownedCompanies.map((c) => `${c.name} — **${fmt(c.price)}**`).join('\n')
          : 'لا تملك أي شركة استثمارية حالياً.',
        inline: false,
      },
      {
        name: '{emoji:crown} منتجات متجر الممتلكات الفاخرة',
        value: ownedProducts.length
          ? ownedProducts.map((p) => `${p.product.name} × ${p.qty} — **${fmt(p.price * p.qty)}**`).join('\n')
          : 'لا تملك أي منتج من المتجر الفاخر حالياً.',
        inline: false,
      },
      { name: '{emoji:trophy} إجمالي القيمة التقريبية للممتلكات', value: fmt(totalValue), inline: false }
    )
    .setFooter({ text: 'استخدم أمر "شراء" لفتح المتجر، و"بيع" للتخلص من ممتلكاتك مقابل المال.' })
    .setTimestamp();

  return ctx.reply({ embeds: [embed] });
}

/* ---------------------- الهدايا الدورية ---------------------- */

async function cmdDaily(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'daily', 43200000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار للحصول على الهدية اليومية مرة أخرى.', remaining)] });

  const giftAmount = Math.floor(Math.random() * 4000) + 1000;
  const wallet = (await getWallet(ctx.userId)) + giftAmount;
  await setWallet(ctx.userId, wallet);
  await setCooldown(ctx.userId, 'daily');

  const unlocked = (await unlockAchievement(ctx.userId, 'first_daily')) ? ['first_daily'] : [];

  const embed = new EmbedBuilder()
    .setDescription(
      `{emoji:gift} لقد حصلت على الهدية اليومية بقيمة **${fmt(giftAmount)}**!\nرصيد محفظتك الحالي هو **${fmt(wallet)}**.`
    )
    .setColor(COLOR_WIN);
  const footer = achievementFooter(unlocked);
  if (footer) embed.setFooter({ text: footer });

  return ctx.reply({ embeds: [embed] });
}

async function cmdWeekly(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'weekly', 604800000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار للحصول على الهدية الأسبوعية مرة أخرى.', remaining)] });

  const giftAmount = Math.floor(Math.random() * 30000) + 20000;
  const wallet = (await getWallet(ctx.userId)) + giftAmount;
  await setWallet(ctx.userId, wallet);
  await setCooldown(ctx.userId, 'weekly');

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `{emoji:confetti} حصلت على الهدية الأسبوعية الكبرى بقيمة **${fmt(giftAmount)}**!\nرصيد محفظتك الحالي هو **${fmt(wallet)}**.`
        )
        .setColor(COLOR_WIN),
    ],
  });
}

/* ---------------------- الإيداع والسحب ---------------------- */

async function cmdDeposit(ctx) {
  const wallet = await getWallet(ctx.userId);
  const { value, error } = parseAmount(ctx.getString('amount'), wallet);
  if (error) return ctx.reply({ embeds: [errorEmbed(error)] });
  if (value > wallet) return ctx.reply({ embeds: [errorEmbed('رصيد محفظتك لا يكفي لهذا الإيداع.')] });

  await setWallet(ctx.userId, wallet - value);
  const vault = (await getVault(ctx.userId)) + value;
  await setVault(ctx.userId, vault);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `{emoji:shield} تم إيداع **${fmt(value)}** في خزنتك الآمنة.\nرصيد الخزنة الآن: **${fmt(vault)}** (تربح فوائد وتحميك من السرقة).`
        )
        .setColor(COLOR_WIN),
    ],
  });
}

async function cmdWithdraw(ctx) {
  const vault = await getVault(ctx.userId);
  const { value, error } = parseAmount(ctx.getString('amount'), vault);
  if (error) return ctx.reply({ embeds: [errorEmbed(error)] });
  if (value > vault) return ctx.reply({ embeds: [errorEmbed('رصيد خزنتك الآمنة لا يكفي لهذا السحب.')] });

  await setVault(ctx.userId, vault - value);
  const wallet = (await getWallet(ctx.userId)) + value;
  await setWallet(ctx.userId, wallet);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(`{emoji:gift} تم سحب **${fmt(value)}** إلى محفظتك.\nرصيد المحفظة الآن: **${fmt(wallet)}**.`)
        .setColor(COLOR_WIN),
    ],
  });
}

/* ---------------------- التحويل ---------------------- */

async function cmdTransfer(ctx) {
  const targetUser = ctx.getUser('user');
  if (!targetUser) return ctx.reply({ embeds: [errorEmbed('يرجى تحديد المستخدم المراد التحويل له (منشن أو آيدي صحيح).')] });
  if (targetUser.bot || targetUser.id === ctx.userId) {
    return ctx.reply({ embeds: [errorEmbed('لا يمكنك تحويل الأموال لنفسك أو لبوت.')] });
  }

  const wallet = await getWallet(ctx.userId);
  const { value: amount, error } = parseAmount(ctx.getString('amount'), wallet);
  if (error) return ctx.reply({ embeds: [errorEmbed(error)] });
  if (wallet < amount) return ctx.reply({ embeds: [errorEmbed(`رصيد محفظتك غير كافٍ. رصيدك الحالي: **${fmt(wallet)}**`)] });

  const outstandingLoan = await db.getKV(`loan_${ctx.userId}`);
  if (outstandingLoan && outstandingLoan > 0) {
    return ctx.reply({ embeds: [errorEmbed('لا يمكنك تحويل الأموال وأنت مطالب بتسديد قرض نشط للبنك.')] });
  }

  const tax = Math.floor(amount * 0.2);
  const netAmount = amount - tax;

  await setWallet(ctx.userId, wallet - amount);
  const targetWallet = (await getWallet(targetUser.id)) + netAmount;
  await setWallet(targetUser.id, targetWallet);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `{emoji:gift} تم تحويل **${fmt(netAmount)}** إلى <@${targetUser.id}> بعد خصم ضريبة تحويل 20% بقيمة **${fmt(tax)}**.`
        )
        .setColor(COLOR_WIN),
    ],
  });
}

/* ---------------------- الراتب والمداخيل ---------------------- */

async function cmdSalary(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'salary', 21600000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار لاستلام الراتب مرة أخرى.', remaining)] });

  const jobName = await db.getKV(`job_${ctx.userId}`);
  let salary = 500;
  if (jobName) {
    const jobInfo = jobTitles.find((j) => j.name === jobName);
    if (jobInfo) salary = jobInfo.salary;
  }

  const userHouses = (await db.getKV(`user_houses_${ctx.userId}`)) || 0;
  const houseIncome = userHouses * 200000;

  let companyIncome = 0;
  const companyLines = [];
  for (const comp of companiesData) {
    const owner = await db.getKV(`company_${comp.id}_owner`);
    if (owner === ctx.userId) {
      // تقلب بسيط في السوق يجعل كل كشف راتب مختلف قليلاً
      const fluctuation = 0.85 + Math.random() * 0.3;
      const income = Math.floor(comp.rent * fluctuation);
      companyIncome += income;
      companyLines.push(`${comp.name}: ${fmt(income)}`);
    }
  }

  const totalIncome = salary + houseIncome + companyIncome;
  const wallet = (await getWallet(ctx.userId)) + totalIncome;
  await setWallet(ctx.userId, wallet);
  await setCooldown(ctx.userId, 'salary');

  const embed = new EmbedBuilder()
    .setTitle('{emoji:briefcase} كشف الراتب والمداخيل')
    .setDescription(`مرحباً <@${ctx.userId}>، تم إيداع مداخيلك في محفظتك:`)
    .addFields(
      { name: '{emoji:briefcase} راتب الوظيفة الحالية', value: fmt(salary), inline: true },
      { name: '{emoji:briefcase} أرباح العقارات والمنازل', value: fmt(houseIncome), inline: true },
      { name: '{emoji:briefcase} أرباح الشركات المملوكة', value: fmt(companyIncome), inline: true },
      { name: '{emoji:chartpie} مجموع الدخل المودع', value: fmt(totalIncome), inline: false }
    )
    .setColor(COLOR)
    .setFooter({ text: `رصيد محفظتك الحالي: ${fmt(wallet)}` });

  if (companyLines.length) {
    embed.addFields({ name: '{emoji:chartpie} تفصيل دخل الشركات (تقلب يومي)', value: companyLines.join('\n'), inline: false });
  }

  return ctx.reply({ embeds: [embed] });
}

/* ---------------------- الوظائف ---------------------- */

async function cmdJob(ctx) {
  const action = (ctx.getString('action') || '').toLowerCase();

  if (action === 'list' || action === '') {
    const currentJob = await db.getKV(`job_${ctx.userId}`);
    const embed = new EmbedBuilder()
      .setTitle('{emoji:briefcase} قائمة الوظائف المتاحة')
      .setDescription('شراء الوظائف ذات التكلفة الأعلى يمنحك راتباً أكبر عند استلام الراتب!\nاختر الوظيفة التي تريد شراءها من القائمة أدناه.')
      .setColor(COLOR);

    jobTitles.forEach((job, i) => {
      const isCurrent = job.name === currentJob;
      embed.addFields({
        name: `${i + 1}. ${isCurrent ? '{emoji:crown} ' : '{emoji:briefcase} '}${job.name}${isCurrent ? ' (وظيفتك الحالية)' : ''}`,
        value: `{emoji:gift} التكلفة: **${fmt(job.cost)}** | {emoji:chartpie} الراتب: **${fmt(job.salary)}**`,
      });
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`bankjob_${ctx.userId}`)
      .setPlaceholder('اختر وظيفة لشرائها...')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        jobTitles.map((job, i) => ({
          label: `${i + 1}. ${job.name}${job.name === currentJob ? ' (وظيفتك الحالية)' : ''}`,
          description: `التكلفة: ${fmt(job.cost)} — الراتب: ${fmt(job.salary)}`,
          value: String(i),
          default: job.name === currentJob,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);
    const sent = await ctx.reply({ embeds: [embed], components: [row] });
    setupJobMenu(ctx, sent);
    return sent;
  }

  if (action === 'current') {
    const currentJob = await db.getKV(`job_${ctx.userId}`);
    if (!currentJob) return ctx.reply({ embeds: [errorEmbed('ليس لديك وظيفة حالياً. استخدم `job list` لعرض الوظائف المتاحة.')] });
    const jobInfo = jobTitles.find((j) => j.name === currentJob);
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`{emoji:briefcase} وظيفتك الحالية هي **${currentJob}**\n{emoji:chartpie} راتبك: **${fmt(jobInfo ? jobInfo.salary : 500)}**`)
          .setColor(COLOR),
      ],
    });
  }

  if (action === 'buy') {
    const query = ctx.getString('name');
    if (!query) return ctx.reply({ embeds: [errorEmbed('يرجى كتابة اسم أو رقم الوظيفة التي تود شراءها.')] });

    const jobInfo = findJob(query);
    if (!jobInfo) return ctx.reply({ embeds: [errorEmbed('لم يتم العثور على الوظيفة المطلوبة. استخدم `job list` لعرض الأسماء والأرقام الصحيحة.')] });

    return purchaseJob(ctx, jobInfo);
  }

  return ctx.reply({ embeds: [errorEmbed('إجراء غير معروف. الخيارات المتاحة: list / buy / current')] });
}

async function purchaseJob(ctx, jobInfo) {
  const wallet = await getWallet(ctx.userId);
  if (wallet < jobInfo.cost) {
    return ctx.reply({ embeds: [errorEmbed(`رصيدك غير كافٍ لشراء هذه الوظيفة. التكلفة: **${fmt(jobInfo.cost)}**`)] });
  }

  await setWallet(ctx.userId, wallet - jobInfo.cost);
  await db.setKV(`job_${ctx.userId}`, jobInfo.name);
  const unlocked = (await unlockAchievement(ctx.userId, 'first_job')) ? ['first_job'] : [];

  const embed = new EmbedBuilder()
    .setDescription(`{emoji:circlecheck} مبروك! لقد اشتريت وظيفة **${jobInfo.name}** بنجاح.\nراتبك الجديد هو **${fmt(jobInfo.salary)}**.`)
    .setColor(COLOR_WIN);
  const footer = achievementFooter(unlocked);
  if (footer) embed.setFooter({ text: footer });

  return ctx.reply({ embeds: [embed] });
}

function setupJobMenu(ctx, sentMessage) {
  if (!sentMessage || !sentMessage.createMessageComponentCollector) return;
  try {
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });
    collector.on('collect', async (menuInteraction) => {
      if (menuInteraction.user.id !== ctx.userId) {
        return menuInteraction.reply({ content: '{emoji:circlex} هذه القائمة ليست لك.', ephemeral: true });
      }
      const idx = parseInt(menuInteraction.values[0], 10);
      const jobInfo = jobTitles[idx];
      if (!jobInfo) return menuInteraction.reply({ content: '{emoji:circlex} وظيفة غير صالحة.', ephemeral: true });

      const currentJob = await db.getKV(`job_${ctx.userId}`);
      if (jobInfo.name === currentJob) {
        return menuInteraction.reply({ content: '{emoji:circlex} هذه وظيفتك الحالية بالفعل.', ephemeral: true });
      }

      const wallet = await getWallet(ctx.userId);
      if (wallet < jobInfo.cost) {
        return menuInteraction.reply({ content: `{emoji:circlex} رصيدك غير كافٍ لشراء وظيفة **${jobInfo.name}**.`, ephemeral: true });
      }
      await setWallet(ctx.userId, wallet - jobInfo.cost);
      await db.setKV(`job_${ctx.userId}`, jobInfo.name);
      await unlockAchievement(ctx.userId, 'first_job');
      return menuInteraction.reply({
        content: `{emoji:circlecheck} تم شراء وظيفة **${jobInfo.name}** بنجاح! راتبك الجديد: **${fmt(jobInfo.salary)}**.`,
        ephemeral: true,
      });
    });
  } catch {
    /* تجاهل الأخطاء إن كانت الرسالة لا تدعم collectors (مثلاً ephemeral) */
  }
}

/* ---------------------- القروض ---------------------- */

async function cmdLoan(ctx) {
  const existingLoan = await db.getKV(`loan_${ctx.userId}`);
  if (existingLoan && existingLoan > 0) {
    return ctx.reply({ embeds: [errorEmbed('لديك قرض قائم بالفعل. قم بتسديده لتتمكن من طلب قرض جديد.')] });
  }

  const wallet = await getWallet(ctx.userId);
  const vault = await getVault(ctx.userId);
  const netWorth = wallet + vault;
  const rankIndex = RANKS.findIndex((r) => r.name === getRank(netWorth));
  const loanAmount = Math.min(500000, 100000 + Math.max(0, rankIndex) * 100000);

  await setWallet(ctx.userId, wallet + loanAmount);
  await db.setKV(`loan_${ctx.userId}`, loanAmount);
  await db.setKV(`loan_repay_${ctx.userId}`, Date.now() + 3600000);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `{emoji:briefcase} تم منحك قرض بقيمة **${fmt(loanAmount)}** وتم إيداعه في محفظتك.\nيجب عليك سداد القرض خلال ساعة واحدة لتفادي الخصم التلقائي.`
        )
        .setColor(COLOR),
    ],
  });
}

async function cmdPayLoan(ctx) {
  const outstandingLoan = await db.getKV(`loan_${ctx.userId}`);
  if (!outstandingLoan || outstandingLoan <= 0) {
    return ctx.reply({ embeds: [errorEmbed('ليس عليك أي قرض قائم حالياً لتسديده.')] });
  }

  const wallet = await getWallet(ctx.userId);
  if (wallet < outstandingLoan) {
    return ctx.reply({ embeds: [errorEmbed(`رصيد محفظتك لا يكفي لتسديد القرض. المطلوب: **${fmt(outstandingLoan)}**`)] });
  }

  await setWallet(ctx.userId, wallet - outstandingLoan);
  await db.deleteKV(`loan_${ctx.userId}`);
  await db.deleteKV(`loan_repay_${ctx.userId}`);
  const unlocked = (await unlockAchievement(ctx.userId, 'debt_free')) ? ['debt_free'] : [];

  const embed = new EmbedBuilder()
    .setDescription(`{emoji:circlecheck} تم تسديد القرض البنكي بقيمة **${fmt(outstandingLoan)}** بالكامل بنجاح.`)
    .setColor(COLOR_WIN);
  const footer = achievementFooter(unlocked);
  if (footer) embed.setFooter({ text: footer });

  return ctx.reply({ embeds: [embed] });
}

/* ---------------------- الاستثمار والتداول ---------------------- */

async function cmdInvestTrade(ctx, key, riskPct, cooldownMs, label, labelDef) {
  const remaining = await checkCooldown(ctx.userId, key, cooldownMs);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed(`يرجى الانتظار لـ${labelDef} مرة أخرى.`, remaining)] });

  const amount = ctx.getInteger('amount');
  if (!amount || amount < 100) return ctx.reply({ embeds: [errorEmbed('يجب أن يكون المبلغ 100 على الأقل.')] });

  const wallet = await getWallet(ctx.userId);
  if (wallet < amount) return ctx.reply({ embeds: [errorEmbed(`رصيد محفظتك لا يكفي لهذا ${label}.`)] });

  const isWin = Math.random() < 0.5;
  const diff = Math.floor(amount * riskPct);
  const newWallet = isWin ? wallet + diff : wallet - diff;

  await setWallet(ctx.userId, newWallet);
  await setCooldown(ctx.userId, key);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          isWin
            ? `{emoji:chartpie} ${label} ناجح! لقد ربحت **${fmt(diff)}**.`
            : `{emoji:circlex} ${label} خاسر! فقدت **${fmt(diff)}**.`
        )
        .setColor(isWin ? COLOR_WIN : COLOR_ERROR),
    ],
  });
}

/* ---------------------- العقارات (منازل) والشركات ---------------------- */

async function cmdBuy(ctx) {
  const type = ctx.getString('type');
  if (type === 'house') return buyHouse(ctx);
  if (type === 'company') return buyCompany(ctx, ctx.getInteger('id'));
  return openShop(ctx);
}

async function buyHouse(ctx) {
  const houseCost = 1000000;
  const userHouses = (await db.getKV(`user_houses_${ctx.userId}`)) || 0;
  if (userHouses >= 5) return ctx.reply({ embeds: [errorEmbed('لقد بلغت الحد الأقصى لشراء المنازل (5 منازل).')] });

  const wallet = await getWallet(ctx.userId);
  if (wallet < houseCost) return ctx.reply({ embeds: [errorEmbed(`رصيدك غير كافٍ لشراء منزل. السعر: **${fmt(houseCost)}**`)] });

  await setWallet(ctx.userId, wallet - houseCost);
  await db.setKV(`user_houses_${ctx.userId}`, userHouses + 1);

  const newCount = userHouses + 1;
  const unlocked = [];
  if (await unlockAchievement(ctx.userId, 'first_house')) unlocked.push('first_house');
  if (newCount >= 5 && (await unlockAchievement(ctx.userId, 'full_estate'))) unlocked.push('full_estate');

  const embed = new EmbedBuilder()
    .setDescription(`{emoji:circlecheck} مبروك! لقد اشتريت منزلاً جديداً بنجاح.\nعدد منازلك الحالية: **${newCount}/5** (كل منزل يمنحك 200,000 دخل إضافي مع كل راتب).`)
    .setColor(COLOR_WIN);
  const footer = achievementFooter(unlocked);
  if (footer) embed.setFooter({ text: footer });
  return ctx.reply({ embeds: [embed] });
}

async function buyCompany(ctx, compId) {
  if (!compId) return ctx.reply({ embeds: [errorEmbed('يجب تحديد رقم الشركة المطلوب شراءها (1-10).')] });

  const comp = companiesData.find((c) => c.id === compId);
  if (!comp) return ctx.reply({ embeds: [errorEmbed('رقم الشركة غير صحيح.')] });

  const owner = await db.getKV(`company_${compId}_owner`);
  if (owner) return ctx.reply({ embeds: [errorEmbed(`هذه الشركة مملوكة بالفعل لعضو آخر (<@${owner}>).`)] });

  const wallet = await getWallet(ctx.userId);
  if (wallet < comp.price) return ctx.reply({ embeds: [errorEmbed(`رصيدك غير كافٍ لشراء الشركة. السعر: **${fmt(comp.price)}**`)] });

  await setWallet(ctx.userId, wallet - comp.price);
  await db.setKV(`company_${compId}_owner`, ctx.userId);
  const unlocked = (await unlockAchievement(ctx.userId, 'company_owner')) ? ['company_owner'] : [];

  const embed = new EmbedBuilder()
    .setDescription(`{emoji:circlecheck} مبروك! لقد اشتريت شركة **${comp.name}** بنجاح.\nستحصد أرباح هذه الشركة عند كل استلام راتب.`)
    .setColor(COLOR_WIN);
  const footer = achievementFooter(unlocked);
  if (footer) embed.setFooter({ text: footer });
  return ctx.reply({ embeds: [embed] });
}

async function cmdCompanies(ctx) {
  const embed = new EmbedBuilder()
    .setTitle('{emoji:briefcase} دليل الشركات الاستثمارية')
    .setDescription('تمنحك الشركات دخلاً هائلاً (يتقلب قليلاً كل راتب) ولكن بتكلفة شراء عالية!\nاختر شركة من القائمة أدناه لشرائها.')
    .setColor(COLOR);

  const options = [];
  for (const comp of companiesData) {
    const owner = await db.getKV(`company_${comp.id}_owner`);
    const ownerMention = owner ? `<@${owner}>` : 'لا يوجد مالك';
    embed.addFields({
      name: `${comp.id}. ${comp.name}`,
      value: `{emoji:gift} السعر: **${fmt(comp.price)}** | {emoji:chartpie} الدخل التقريبي: **${fmt(comp.rent)}**\n{emoji:crown} المالك الحالي: ${ownerMention}`,
    });
    options.push({
      label: `${comp.id}. ${comp.name}${owner ? ' (مملوكة)' : ''}`,
      description: `السعر: ${fmt(comp.price)} — الدخل: ${fmt(comp.rent)}`,
      value: String(comp.id),
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`bankcomp_${ctx.userId}`)
    .setPlaceholder('اختر شركة لشرائها...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const sent = await ctx.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  setupCompanyMenu(ctx, sent);
  return sent;
}

function setupCompanyMenu(ctx, sentMessage) {
  if (!sentMessage || !sentMessage.createMessageComponentCollector) return;
  try {
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });
    collector.on('collect', async (menuInteraction) => {
      if (menuInteraction.user.id !== ctx.userId) {
        return menuInteraction.reply({ content: '{emoji:circlex} هذه القائمة ليست لك.', ephemeral: true });
      }
      const compId = parseInt(menuInteraction.values[0], 10);
      const comp = companiesData.find((c) => c.id === compId);
      if (!comp) return menuInteraction.reply({ content: '{emoji:circlex} شركة غير صالحة.', ephemeral: true });

      const owner = await db.getKV(`company_${compId}_owner`);
      if (owner) return menuInteraction.reply({ content: '{emoji:circlex} هذه الشركة أصبحت مملوكة بالفعل.', ephemeral: true });

      const wallet = await getWallet(ctx.userId);
      if (wallet < comp.price) {
        return menuInteraction.reply({ content: `{emoji:circlex} رصيدك غير كافٍ لشراء **${comp.name}**.`, ephemeral: true });
      }
      await setWallet(ctx.userId, wallet - comp.price);
      await db.setKV(`company_${compId}_owner`, ctx.userId);
      await unlockAchievement(ctx.userId, 'company_owner');
      return menuInteraction.reply({ content: `{emoji:circlecheck} تم شراء شركة **${comp.name}** بنجاح!`, ephemeral: true });
    });
  } catch {
    /* تجاهل */
  }
}

/* ---------------------- متجر الممتلكات الفاخرة (شراء / بيع / أسعار) ---------------------- */

async function openShop(ctx) {
  const options = [];
  for (const product of PRODUCTS) {
    const { price } = await getProductPrice(product.id);
    options.push({
      label: `${product.name} — ${fmt(price)}`,
      description: `فئة: ${product.tag} — اقتنِ ${product.name} لتعزيز ثروتك`,
      value: String(product.id),
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`bankshop_${ctx.userId}`)
    .setPlaceholder('اختر منتجاً لشرائه من المتجر...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const embed = new EmbedBuilder()
    .setDescription(
      `{emoji:gift} أهلاً بك في **متجر الممتلكات الفاخرة**!\n` +
        `هنا يمكنك اقتناء أفخم السيارات والدراجات واليخوت والطائرات، بل وحتى الجزر والقصور الخاصة، لتعزيز مكانتك ورفع صافي ثروتك.\n\n` +
        `{emoji:chartpie} أسعار كل المنتجات تتغير تلقائياً كل 30 دقيقة صعوداً وهبوطاً حسب حركة السوق، لذا راقب أمر \`اسعار\` لاقتناص أفضل الصفقات قبل شرائك.\n\n` +
        `{emoji:crown} اختر المنتج الذي ترغب باقتنائه من القائمة أدناه.`
    )
    .setColor(COLOR);

  const sent = await ctx.reply({ content: `<@${ctx.userId}>`, embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  setupShopMenu(ctx, sent);
  return sent;
}

function setupShopMenu(ctx, sentMessage) {
  if (!sentMessage || !sentMessage.createMessageComponentCollector) return;
  try {
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 90000,
    });
    collector.on('collect', async (menuInteraction) => {
      if (menuInteraction.user.id !== ctx.userId) {
        return menuInteraction.reply({ content: '{emoji:circlex} هذه القائمة ليست لك.', ephemeral: true });
      }
      const productId = parseInt(menuInteraction.values[0], 10);
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product) return menuInteraction.reply({ content: '{emoji:circlex} منتج غير صالح.', ephemeral: true });

      const { price } = await getProductPrice(productId);
      const wallet = await getWallet(ctx.userId);
      if (wallet < price) {
        return menuInteraction.reply({
          content: `{emoji:circlex} رصيدك غير كافٍ لشراء **${product.name}**. السعر الحالي: **${fmt(price)}**.`,
          ephemeral: true,
        });
      }

      await setWallet(ctx.userId, wallet - price);
      const products = await getUserProducts(ctx.userId);
      products[productId] = (products[productId] || 0) + 1;
      await setUserProducts(ctx.userId, products);

      const unlockedIds = [];
      if (await unlockAchievement(ctx.userId, 'first_purchase')) unlockedIds.push('first_purchase');
      const ownsAll = PRODUCTS.every((p) => products[p.id] && products[p.id] > 0);
      if (ownsAll && (await unlockAchievement(ctx.userId, 'collector'))) unlockedIds.push('collector');

      let msg = `{emoji:circlecheck} تم شراء **${product.name}** بنجاح مقابل **${fmt(price)}**!`;
      const footer = achievementFooter(unlockedIds);
      if (footer) msg += `\n${footer}`;

      return menuInteraction.reply({ content: msg, ephemeral: true });
    });
  } catch {
    /* تجاهل */
  }
}

async function cmdPrices(ctx) {
  const embed = new EmbedBuilder()
    .setTitle('{emoji:chartpie} أسعار متجر الممتلكات الفاخرة')
    .setDescription('الأسعار تتغير تلقائياً كل 30 دقيقة صعوداً وهبوطاً حسب حركة السوق.\nاختر منتجاً من القائمة أدناه لعرض تفاصيل سعره الكاملة.')
    .setColor(COLOR)
    .setTimestamp();

  const options = [];
  for (const product of PRODUCTS) {
    const { price, base } = await getProductPrice(product.id);
    const diff = price - base;
    const pct = ((diff / base) * 100).toFixed(1);
    const trendText = diff > 0 ? `{emoji:confetti} ارتفاع ${pct}%` : diff < 0 ? `{emoji:circlex} انخفاض ${Math.abs(pct)}%` : 'مستقر';
    embed.addFields({
      name: `${product.name} (${product.tag})`,
      value: `السعر الحالي: **${fmt(price)}**\n${trendText}`,
      inline: true,
    });
    options.push({
      label: `${product.name} — ${fmt(price)}`,
      description: `الفئة: ${product.tag}`,
      value: String(product.id),
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`bankpriceinfo_${ctx.userId}`)
    .setPlaceholder('اختر منتجاً لعرض تفاصيل سعره...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const sent = await ctx.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  setupPriceInfoMenu(ctx, sent);
  return sent;
}

function setupPriceInfoMenu(ctx, sentMessage) {
  if (!sentMessage || !sentMessage.createMessageComponentCollector) return;
  try {
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 90000,
    });
    collector.on('collect', async (menuInteraction) => {
      if (menuInteraction.user.id !== ctx.userId) {
        return menuInteraction.reply({ content: '{emoji:circlex} هذه القائمة ليست لك.', ephemeral: true });
      }
      const productId = parseInt(menuInteraction.values[0], 10);
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product) return menuInteraction.reply({ content: '{emoji:circlex} منتج غير صالح.', ephemeral: true });

      const { price, min, max, base } = await getProductPrice(productId);
      const detailEmbed = new EmbedBuilder()
        .setTitle(`{emoji:chartpie} تفاصيل سعر: ${product.name}`)
        .setColor(COLOR)
        .addFields(
          { name: '{emoji:briefcase} الفئة', value: product.tag, inline: true },
          { name: '{emoji:gift} السعر الأساسي', value: fmt(base), inline: true },
          { name: '{emoji:chartpie} السعر الحالي', value: fmt(price), inline: true },
          { name: '{emoji:circlex} أدنى سعر وصل له', value: fmt(min), inline: true },
          { name: '{emoji:confetti} أعلى سعر وصل له', value: fmt(max), inline: true },
          { name: '{emoji:clock} تحديث السعر التالي', value: 'خلال 30 دقيقة كحد أقصى', inline: true }
        )
        .setTimestamp();

      return menuInteraction.reply({ embeds: [detailEmbed], ephemeral: true });
    });
  } catch {
    /* تجاهل */
  }
}

async function cmdSell(ctx) {
  const type = ctx.getString('type');
  if (type === 'house') return sellHouse(ctx);
  if (type === 'company') return sellCompany(ctx, ctx.getInteger('id'));
  return openSellMenu(ctx);
}

async function sellHouse(ctx) {
  const userHouses = (await db.getKV(`user_houses_${ctx.userId}`)) || 0;
  if (userHouses <= 0) return ctx.reply({ embeds: [errorEmbed('لا تملك أي منزل لبيعه.')] });

  const refund = 500000;
  const wallet = (await getWallet(ctx.userId)) + refund;
  await setWallet(ctx.userId, wallet);
  await db.setKV(`user_houses_${ctx.userId}`, userHouses - 1);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(`{emoji:circlecheck} تم بيع منزل واحد مقابل **${fmt(refund)}**.\nعدد منازلك المتبقية: **${userHouses - 1}/5**.`)
        .setColor(COLOR),
    ],
  });
}

async function sellCompany(ctx, compId) {
  const comp = companiesData.find((c) => c.id === compId);
  if (!comp) return ctx.reply({ embeds: [errorEmbed('يجب تحديد رقم شركة صحيح (1-10) تملكها.')] });

  const owner = await db.getKV(`company_${compId}_owner`);
  if (owner !== ctx.userId) return ctx.reply({ embeds: [errorEmbed('أنت لا تملك هذه الشركة.')] });

  const refund = Math.floor(comp.price * 0.5);
  const wallet = (await getWallet(ctx.userId)) + refund;
  await setWallet(ctx.userId, wallet);
  await db.deleteKV(`company_${compId}_owner`);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(`{emoji:circlecheck} تم بيع شركة **${comp.name}** مقابل **${fmt(refund)}** (نصف السعر الأصلي).`)
        .setColor(COLOR),
    ],
  });
}

async function openSellMenu(ctx) {
  const options = [];

  const houses = (await db.getKV(`user_houses_${ctx.userId}`)) || 0;
  if (houses > 0) {
    options.push({
      label: `منزل (تملك ${houses})`,
      description: `بيع منزل واحد مقابل ${fmt(500000)}`,
      value: 'house',
    });
  }

  for (const comp of companiesData) {
    const owner = await db.getKV(`company_${comp.id}_owner`);
    if (owner === ctx.userId) {
      const refund = Math.floor(comp.price * 0.5);
      options.push({
        label: comp.name,
        description: `بيع الشركة مقابل ${fmt(refund)}`,
        value: `company_${comp.id}`,
      });
    }
  }

  const productsOwned = await getUserProducts(ctx.userId);
  for (const product of PRODUCTS) {
    const qty = productsOwned[product.id] || 0;
    if (qty > 0) {
      const { price } = await getProductPrice(product.id);
      const refund = Math.floor(price * SELL_RATE_PRODUCT);
      options.push({
        label: `${product.name} (تملك ${qty})`,
        description: `بيع قطعة واحدة مقابل ${fmt(refund)}`,
        value: `product_${product.id}`,
      });
    }
  }

  if (!options.length) {
    return ctx.reply({ embeds: [errorEmbed('لا تملك أي ممتلكات قابلة للبيع حالياً. استخدم أمر `شراء` لاقتناء منتجات أو عقارات أولاً.')] });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`banksell_${ctx.userId}`)
    .setPlaceholder('اختر ما ترغب ببيعه...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options.slice(0, 25));

  const embed = new EmbedBuilder()
    .setTitle('{emoji:gift} بيع الممتلكات')
    .setDescription('اختر من القائمة أدناه الممتلكات التي ترغب ببيعها مقابل جزء من قيمتها الحالية.')
    .setColor(COLOR);

  const sent = await ctx.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  setupSellMenu(ctx, sent);
  return sent;
}

function setupSellMenu(ctx, sentMessage) {
  if (!sentMessage || !sentMessage.createMessageComponentCollector) return;
  try {
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 90000,
    });
    collector.on('collect', async (menuInteraction) => {
      if (menuInteraction.user.id !== ctx.userId) {
        return menuInteraction.reply({ content: '{emoji:circlex} هذه القائمة ليست لك.', ephemeral: true });
      }
      const value = menuInteraction.values[0];

      if (value === 'house') {
        const houses = (await db.getKV(`user_houses_${ctx.userId}`)) || 0;
        if (houses <= 0) return menuInteraction.reply({ content: '{emoji:circlex} لم يعد لديك منزل لبيعه.', ephemeral: true });
        const refund = 500000;
        const wallet = (await getWallet(ctx.userId)) + refund;
        await setWallet(ctx.userId, wallet);
        await db.setKV(`user_houses_${ctx.userId}`, houses - 1);
        return menuInteraction.reply({ content: `{emoji:circlecheck} تم بيع منزل مقابل **${fmt(refund)}**.`, ephemeral: true });
      }

      if (value.startsWith('company_')) {
        const compId = parseInt(value.split('_')[1], 10);
        const comp = companiesData.find((c) => c.id === compId);
        if (!comp) return menuInteraction.reply({ content: '{emoji:circlex} شركة غير صالحة.', ephemeral: true });
        const owner = await db.getKV(`company_${compId}_owner`);
        if (owner !== ctx.userId) return menuInteraction.reply({ content: '{emoji:circlex} لم تعد تملك هذه الشركة.', ephemeral: true });
        const refund = Math.floor(comp.price * 0.5);
        const wallet = (await getWallet(ctx.userId)) + refund;
        await setWallet(ctx.userId, wallet);
        await db.deleteKV(`company_${compId}_owner`);
        return menuInteraction.reply({ content: `{emoji:circlecheck} تم بيع شركة **${comp.name}** مقابل **${fmt(refund)}**.`, ephemeral: true });
      }

      if (value.startsWith('product_')) {
        const productId = parseInt(value.split('_')[1], 10);
        const product = PRODUCTS.find((p) => p.id === productId);
        if (!product) return menuInteraction.reply({ content: '{emoji:circlex} منتج غير صالح.', ephemeral: true });
        const products = await getUserProducts(ctx.userId);
        const qty = products[productId] || 0;
        if (qty <= 0) return menuInteraction.reply({ content: '{emoji:circlex} لم يعد لديك هذا المنتج.', ephemeral: true });

        const { price } = await getProductPrice(productId);
        const refund = Math.floor(price * SELL_RATE_PRODUCT);

        products[productId] = qty - 1;
        if (products[productId] <= 0) delete products[productId];
        await setUserProducts(ctx.userId, products);

        const wallet = (await getWallet(ctx.userId)) + refund;
        await setWallet(ctx.userId, wallet);

        return menuInteraction.reply({
          content: `{emoji:circlecheck} تم بيع **${product.name}** مقابل **${fmt(refund)}** (65% من سعره الحالي).`,
          ephemeral: true,
        });
      }

      return menuInteraction.reply({ content: '{emoji:circlex} خيار غير معروف.', ephemeral: true });
    });
  } catch {
    /* تجاهل */
  }
}

/* ---------------------- ألعاب الحظ ---------------------- */

async function checkCooldown(userId, key, ms) {
  const last = await db.getKV(`cooldown_${key}_${userId}`);
  const now = Date.now();
  if (last && now - last < ms) return ms - (now - last);
  return 0;
}
async function setCooldown(userId, key) {
  await db.setKV(`cooldown_${key}_${userId}`, Date.now());
}

async function cmdGamble(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'gamble', 1800000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار للمقامرة مرة أخرى.', remaining)] });

  const wallet = await getWallet(ctx.userId);
  const { value: amount, error } = parseAmount(ctx.getString('amount'), wallet);
  if (error) return ctx.reply({ embeds: [errorEmbed(error)] });
  if (amount < 10) return ctx.reply({ embeds: [errorEmbed('الحد الأدنى للرهان هو $10.')] });
  if (wallet < amount) return ctx.reply({ embeds: [errorEmbed('رصيد محفظتك لا يكفي لهذا الرهان.')] });

  const isWin = Math.random() < 0.5;
  const diff = isWin ? Math.floor(amount * 1.5) : amount;
  const newWallet = isWin ? wallet + diff : wallet - diff;

  await setWallet(ctx.userId, newWallet);
  await setCooldown(ctx.userId, 'gamble');

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          isWin
            ? `{emoji:confetti} مبروك! فزت بالمقامرة وربحت **${fmt(diff)}**.\nرصيد محفظتك الحالي: **${fmt(newWallet)}**.`
            : `{emoji:circlex} للأسف! خسرت المقامرة وفقدت **${fmt(diff)}**.\nرصيد محفظتك الحالي: **${fmt(newWallet)}**.`
        )
        .setColor(isWin ? COLOR_WIN : COLOR_ERROR),
    ],
  });
}

async function cmdDice(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'dice', 1800000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار مجدداً للعب النرد.', remaining)] });

  const wallet = await getWallet(ctx.userId);
  const { value: amount, error } = parseAmount(ctx.getString('amount'), wallet);
  if (error) return ctx.reply({ embeds: [errorEmbed(error)] });
  if (amount < 10) return ctx.reply({ embeds: [errorEmbed('الحد الأدنى للرهان هو $10.')] });
  if (wallet < amount) return ctx.reply({ embeds: [errorEmbed('رصيد محفظتك لا يكفي للعب النرد.')] });

  const roll = Math.floor(Math.random() * 6) + 1;
  const isWin = roll >= 4;
  const diff = isWin ? Math.floor(amount * 1.2) : amount;
  const newWallet = isWin ? wallet + diff : wallet - diff;

  await setWallet(ctx.userId, newWallet);
  await setCooldown(ctx.userId, 'dice');

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `{emoji:playerplay} رميت النرد وحصلت على الرقم **${roll}**!\n\n${
            isWin ? `{emoji:confetti} فزت! ربحت **${fmt(diff)}**.` : `{emoji:circlex} خسرت! فقدت **${fmt(diff)}**.`
          }\nرصيد محفظتك الحالي: **${fmt(newWallet)}**.`
        )
        .setColor(isWin ? COLOR_WIN : COLOR_ERROR),
    ],
  });
}

async function cmdCoinflip(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'coin', 900000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار لرمي العملة مرة أخرى.', remaining)] });

  const wallet = await getWallet(ctx.userId);
  const { value: amount, error } = parseAmount(ctx.getString('amount'), wallet);
  if (error) return ctx.reply({ embeds: [errorEmbed(error)] });
  if (amount < 10) return ctx.reply({ embeds: [errorEmbed('الحد الأدنى للرهان هو $10.')] });
  if (wallet < amount) return ctx.reply({ embeds: [errorEmbed('رصيد محفظتك لا يكفي لرمي العملة.')] });

  const side = Math.random() < 0.5 ? 'وجه' : 'كتابة';
  const isWin = Math.random() < 0.5;
  const diff = amount;
  const newWallet = isWin ? wallet + diff : wallet - diff;

  await setWallet(ctx.userId, newWallet);
  await setCooldown(ctx.userId, 'coin');

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `{emoji:playerplay} رميت العملة المعدنية واستقرت على الـ **${side}**!\n\n${
            isWin ? `{emoji:confetti} فزت! ربحت **${fmt(diff)}**.` : `{emoji:circlex} خسرت! فقدت **${fmt(diff)}**.`
          }\nرصيد محفظتك الحالي: **${fmt(newWallet)}**.`
        )
        .setColor(isWin ? COLOR_WIN : COLOR_ERROR),
    ],
  });
}

async function cmdSlots(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'slots', 1200000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار لتشغيل ماكينة السلوتس مرة أخرى.', remaining)] });

  const wallet = await getWallet(ctx.userId);
  const { value: amount, error } = parseAmount(ctx.getString('amount'), wallet);
  if (error) return ctx.reply({ embeds: [errorEmbed(error)] });
  if (amount < 20) return ctx.reply({ embeds: [errorEmbed('الحد الأدنى للرهان هو $20.')] });
  if (wallet < amount) return ctx.reply({ embeds: [errorEmbed('رصيد محفظتك لا يكفي لتشغيل السلوتس.')] });

  const reels = [0, 0, 0].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
  const allMatch = reels[0] === reels[1] && reels[1] === reels[2];
  const twoMatch = !allMatch && (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]);
  const isJackpot = allMatch && reels[0] === SLOT_SYMBOLS[0];

  let diff;
  let isWin;
  if (allMatch) {
    isWin = true;
    diff = isJackpot ? amount * 10 : Math.floor(amount * 4);
  } else if (twoMatch) {
    isWin = true;
    diff = Math.floor(amount * 1.2);
  } else {
    isWin = false;
    diff = amount;
  }

  const newWallet = isWin ? wallet + diff : wallet - diff;
  await setWallet(ctx.userId, newWallet);
  await setCooldown(ctx.userId, 'slots');

  const unlocked = isJackpot && (await unlockAchievement(ctx.userId, 'jackpot')) ? ['jackpot'] : [];

  const embed = new EmbedBuilder()
    .setDescription(
      `{emoji:playerplay} [ ${reels.join(' | ')} ]\n\n${
        isJackpot
          ? `{emoji:confetti} الجائزة الكبرى! ربحت **${fmt(diff)}**!`
          : isWin
          ? `{emoji:confetti} فزت! ربحت **${fmt(diff)}**.`
          : `{emoji:circlex} خسرت! فقدت **${fmt(diff)}**.`
      }\nرصيد محفظتك الحالي: **${fmt(newWallet)}**.`
    )
    .setColor(isWin ? COLOR_WIN : COLOR_ERROR);
  const footer = achievementFooter(unlocked);
  if (footer) embed.setFooter({ text: footer });

  return ctx.reply({ embeds: [embed] });
}

/* ---------------------- السرقة والحماية ---------------------- */

async function cmdRob(ctx) {
  const targetUser = ctx.getUser('user');
  if (!targetUser) return ctx.reply({ embeds: [errorEmbed('يرجى تحديد المستخدم المراد سرقته (منشن أو آيدي صحيح).')] });

  const remaining = await checkCooldown(ctx.userId, 'rob', 7200000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار للنهب مرة أخرى.', remaining)] });

  if (targetUser.bot || targetUser.id === ctx.userId) {
    return ctx.reply({ embeds: [errorEmbed('لا يمكنك سرقة نفسك أو سرقة بوت.')] });
  }

  const targetShield = await db.getKV(`shield_${targetUser.id}`);
  if (targetShield && Date.now() < targetShield) {
    return ctx.reply({ embeds: [errorEmbed('لا يمكنك سرقة هذا العضو لأنه يملك درع حماية نشط!')] });
  }

  const targetWallet = await getWallet(targetUser.id);
  if (targetWallet < 1000) {
    return ctx.reply({ embeds: [errorEmbed('رصيد محفظة الشخص المستهدف ضئيل جداً ولا يستحق المحاولة.')] });
  }

  const isSuccess = Math.random() < 0.5;

  if (isSuccess) {
    const percent = (Math.floor(Math.random() * 20) + 10) / 100;
    const stolen = Math.floor(targetWallet * percent);
    const myWallet = (await getWallet(ctx.userId)) + stolen;

    await setWallet(ctx.userId, myWallet);
    await setWallet(targetUser.id, targetWallet - stolen);
    await setCooldown(ctx.userId, 'rob');
    const unlocked = (await unlockAchievement(ctx.userId, 'successful_heist')) ? ['successful_heist'] : [];

    const embed = new EmbedBuilder()
      .setDescription(`{emoji:gift} نجحت محاولة السرقة! لقد نهبت **${fmt(stolen)}** من محفظة <@${targetUser.id}>.`)
      .setColor(COLOR_WIN);
    const footer = achievementFooter(unlocked);
    if (footer) embed.setFooter({ text: footer });
    return ctx.reply({ embeds: [embed] });
  } else {
    const myWallet = await getWallet(ctx.userId);
    const fine = Math.min(5000, Math.floor(myWallet * 0.1));
    await setWallet(ctx.userId, Math.max(0, myWallet - fine));
    await setCooldown(ctx.userId, 'rob');

    return ctx.reply({
      embeds: [errorEmbed(`تم القبض عليك أثناء محاولة السرقة! فرضت عليك الشرطة غرامة بقيمة **${fmt(fine)}**.`)],
    });
  }
}

async function cmdProtect(ctx) {
  const hours = ctx.getInteger('hours');
  if (!hours || hours < 1 || hours > 3) return ctx.reply({ embeds: [errorEmbed('يجب تحديد عدد ساعات صحيح بين 1 و 3.')] });

  const cost = hours * 500000;
  const wallet = await getWallet(ctx.userId);
  if (wallet < cost) return ctx.reply({ embeds: [errorEmbed(`رصيدك غير كافٍ لشراء الحماية. التكلفة: **${fmt(cost)}**`)] });

  await setWallet(ctx.userId, wallet - cost);
  const expireTime = Date.now() + hours * 3600000;
  await db.setKV(`shield_${ctx.userId}`, expireTime);

  return ctx.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(`{emoji:shield} تم تفعيل درع الحماية بنجاح لمدة **${hours} ساعة** (حتى <t:${Math.floor(expireTime / 1000)}:R>).`)
        .setColor(COLOR_WIN),
    ],
  });
}

/* ---------------------- المتصدرين ---------------------- */

async function cmdTop(ctx) {
  const remaining = await checkCooldown(ctx.userId, 'top', 15000);
  if (remaining) return ctx.reply({ embeds: [cooldownEmbed('يرجى الانتظار قليلاً لتحديث قائمة الأثرياء.', remaining)] });

  const topUsers = await db.getTopBalances(6);
  if (!topUsers.length) return ctx.reply({ embeds: [errorEmbed('لا يوجد أعضاء لديهم رصيد بنكي في السيرفر حالياً.')] });

  const embed = new EmbedBuilder()
    .setTitle('{emoji:trophy} قائمة أغنى الأعضاء في السيرفر')
    .setDescription('الترتيب حسب رصيد المحفظة (لا يشمل الخزنة الآمنة):')
    .setColor(COLOR)
    .setTimestamp();

  for (let i = 0; i < topUsers.length; i++) {
    const u = topUsers[i];
    const vault = await getVault(u.userId);
    const medal = i === 0 ? '{emoji:crown}' : i === 1 ? '{emoji:trophy}' : i === 2 ? '{emoji:trophy}' : '{emoji:user}';
    embed.addFields({
      name: `${medal} المركز ${i + 1}`,
      value: `<@${u.userId}> — محفظة: **${fmt(u.balance)}** | خزنة: **${fmt(vault)}**`,
    });
  }

  await setCooldown(ctx.userId, 'top');
  return ctx.reply({ embeds: [embed] });
}

/* ============================================================
 *  المساعدة (help) — تصميم احترافي مع سيلكت منيو للأقسام
 * ============================================================ */

const HELP_MAIN_VALUE = 'main';

const HELP_CATEGORIES = [
  {
    value: 'basics',
    label: 'الأساسيات',
    description: 'الرصيد، الهدايا، الإيداع والسحب والتحويل',
    title: '{emoji:gift} الأوامر الأساسية',
    intro: 'كل ما يخص إدارة رصيدك اليومي وخزنتك الآمنة.',
    fields: [
      { name: '`balance` — `رصيد`', value: 'عرض رصيد محفظتك وخزنتك الآمنة وصافي ثروتك ورتبتك البنكية.' },
      { name: '`daily` — `يومي`', value: 'الحصول على هدية مالية عشوائية كل 12 ساعة.' },
      { name: '`weekly` — `اسبوعي`', value: 'الحصول على هدية مالية كبرى كل أسبوع.' },
      { name: '`deposit <مبلغ|all>` — `ايداع`', value: 'إيداع أموال في الخزنة الآمنة؛ تحميها من السرقة وتربحك فوائد تلقائية.' },
      { name: '`withdraw <مبلغ|all>` — `سحب`', value: 'سحب أموال من الخزنة الآمنة إلى محفظتك مباشرة.' },
      { name: '`transfer <شخص> <مبلغ|all>` — `تحويل`', value: 'تحويل مبلغ مالي لعضو آخر (يُخصم ضريبة تحويل 20%).' },
    ],
  },
  {
    value: 'work',
    label: 'العمل والدخل',
    description: 'الرواتب، الوظائف، والقروض البنكية',
    title: '{emoji:briefcase} أوامر العمل والدخل',
    intro: 'اعمل، اقترض، وطوّر مصادر دخلك الأساسية.',
    fields: [
      { name: '`salary` — `راتب`', value: 'استلام راتبك الوظيفي وأرباح عقاراتك وشركاتك دفعة واحدة (كل 6 ساعات).' },
      { name: '`job list` — `وظيفة`', value: 'عرض قائمة الوظائف المتاحة والشراء عبر سيلكت منيو تفاعلية.' },
      { name: '`job buy <اسم/رقم>`', value: 'شراء وظيفة جديدة مباشرة لزيادة راتبك.' },
      { name: '`job current`', value: 'عرض وظيفتك الحالية وراتبها الشهري.' },
      { name: '`loan` — `قرض`', value: 'أخذ قرض مالي فوري من البنك حسب رتبتك (يجب سداده خلال ساعة).' },
      { name: '`payloan` — `سداد`', value: 'تسديد القرض الحالي المتبقي عليك بالكامل دفعة واحدة.' },
    ],
  },
  {
    value: 'invest',
    label: 'الاستثمار والعقارات',
    description: 'البورصة، المنازل، والشركات الاستثمارية',
    title: '{emoji:chartpie} أوامر الاستثمار والعقارات',
    intro: 'نمِّ ثروتك عبر الأسهم والعقارات والشركات.',
    fields: [
      { name: '`invest <مبلغ>` — `استثمار`', value: 'استثمار أموالك في البورصة بفرصة ربح/خسارة 10%.' },
      { name: '`trade <مبلغ>` — `تداول`', value: 'تداول العملات والأسهم بفرصة ربح/خسارة 15%.' },
      { name: '`buy house` — `شراء منزل`', value: 'شراء منزل (حتى 5 منازل) يمنحك دخلاً إضافياً مع كل راتب.' },
      { name: '`buy company <رقم>`', value: 'شراء شركة استثمارية مباشرة تدر عليك أرباحاً ضخمة عند كل راتب.' },
      { name: '`companies` — `شركات`', value: 'عرض قائمة الشركات المتاحة وحالتها، والشراء عبر سيلكت منيو.' },
      { name: '`sell house|company` — `بيع`', value: 'بيع منزل أو شركة تملكها مباشرة مقابل نصف السعر.' },
    ],
  },
  {
    value: 'shop',
    label: 'متجر الممتلكات الفاخرة',
    description: 'شراء وبيع سيارات، يخوت، طائرات وغيرها',
    title: '{emoji:crown} متجر الممتلكات الفاخرة',
    intro: 'اقتنِ ممتلكات فاخرة برصيد أسعار متغير باستمرار!',
    fields: [
      { name: '`buy` — `شراء`', value: 'فتح متجر الممتلكات الفاخرة (دراجات، سيارات، يخوت، طائرات، جزر، قصور) عبر سيلكت منيو.' },
      { name: '`prices` — `اسعار`', value: 'عرض الأسعار الحالية لكل منتجات المتجر (تتغير تلقائياً كل 30 دقيقة)، مع سيلكت منيو لتفاصيل كل منتج.' },
      { name: '`sell` — `بيع`', value: 'بيع منتج تملكه من المتجر (أو منزل/شركة) عبر سيلكت منيو موحّدة لكل ممتلكاتك.' },
      { name: '`assets` — `ممتلكات`', value: 'عرض جميع ممتلكاتك: المنازل، الشركات، ومنتجات المتجر الفاخر، بقيمتها الإجمالية.' },
    ],
  },
  {
    value: 'games',
    label: 'ألعاب الحظ',
    description: 'المقامرة، النرد، العملة، والسلوتس',
    title: '{emoji:playerplay} ألعاب الحظ',
    intro: 'جرّب حظك واربح أموالاً إضافية — أو خسرها!',
    fields: [
      { name: '`gamble <مبلغ|all>` — `مقامرة`', value: 'مقامرة بسيطة بفرصة فوز 50% وربح 1.5× المبلغ.' },
      { name: '`dice <مبلغ|all>` — `نرد`', value: 'رمي نرد؛ اربح إن ظهر رقم 4 أو أعلى.' },
      { name: '`coinflip <مبلغ|all>` — `عملة`', value: 'رمي عملة معدنية بفرصة فوز 50%.' },
      { name: '`slots <مبلغ|all>` — `سلوتس`', value: 'ماكينة القمار؛ اجمع 3 رموز متطابقة للفوز بالجائزة الكبرى!' },
    ],
  },
  {
    value: 'social',
    label: 'الأمان والاجتماعي',
    description: 'السرقة، الحماية، الملف الشخصي، والمتصدرين',
    title: '{emoji:shield} الأمان والاجتماعي',
    intro: 'احمِ نفسك من السرقة، واستعرض ملفك وإنجازاتك.',
    fields: [
      { name: '`rob <شخص>` — `سرقة`', value: 'محاولة نهب رصيد عضو آخر (فرصة نجاح 50%، وغرامة إن فشلت).' },
      { name: '`protect <ساعات>` — `حماية`', value: 'شراء درع حماية يحميك من السرقة لمدة تصل إلى 3 ساعات.' },
      { name: '`profile [شخص]` — `بروفايل`', value: 'عرض ملفك الشخصي المالي الكامل، أو ملف أي عضو آخر مع صورته الرمزية.' },
      { name: '`achievements` — `انجازات`', value: 'عرض إنجازاتك البنكية المفتوحة من أصل 12 إنجازاً.' },
      { name: '`top` — `الأثرياء`', value: 'عرض قائمة أغنى الأعضاء في السيرفر.' },
    ],
  },
];

function buildHelpMainEmbed() {
  return new EmbedBuilder()
    .setTitle('{emoji:briefcase} دليل نظام البنك الشامل')
    .setDescription(
      `مرحباً بك في **نظام البنك المتكامل** {emoji:gift}\n` +
        `يقدم لك هذا النظام إدارة كاملة لأموالك: من الرصيد والودائع، إلى الوظائف والقروض، ` +
        `مروراً بالاستثمار والعقارات والشركات، وصولاً إلى متجر الممتلكات الفاخرة وألعاب الحظ!\n\n` +
        `{emoji:crown} يمكنك استخدام الأوامر عبر السلاش \`/bank\` أو عبر بريفكس السيرفر، مثال: \`بنك رصيد\` أو \`bank job buy 3\`.\n\n` +
        `{emoji:chartpie} **اختر قسماً من القائمة أدناه** لعرض شرح مفصل لكل أمر فيه {emoji:playerplay}`
    )
    .addFields(
      HELP_CATEGORIES.map((c) => ({
        name: c.title,
        value: c.description,
        inline: true,
      }))
    )
    .setColor(COLOR)
    .setFooter({ text: 'نظام البنك — كل ما تحتاجه لبناء إمبراطوريتك المالية' })
    .setTimestamp();
}

function buildHelpCategoryEmbed(category) {
  return new EmbedBuilder()
    .setTitle(category.title)
    .setDescription(category.intro)
    .addFields(category.fields)
    .setColor(COLOR)
    .setFooter({ text: 'اختر "القائمة الرئيسية" من القائمة أعلاه للعودة إلى نظرة عامة على كل الأقسام.' })
    .setTimestamp();
}

function buildHelpMenu(selectedValue) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('bankhelp_menu')
    .setPlaceholder('اختر قسماً لعرض أوامره بالتفصيل...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      [
        { value: HELP_MAIN_VALUE, label: 'القائمة الرئيسية', description: 'نظرة عامة على كل أقسام نظام البنك' },
        ...HELP_CATEGORIES.map((c) => ({ value: c.value, label: c.label, description: c.description })),
      ].map((o) => ({ ...o, default: o.value === selectedValue }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

async function cmdHelp(ctx) {
  const embed = buildHelpMainEmbed();
  const row = buildHelpMenu(HELP_MAIN_VALUE);

  const sent = await ctx.reply({ embeds: [embed], components: [row] });
  setupHelpMenu(ctx, sent);
  return sent;
}

function setupHelpMenu(ctx, sentMessage) {
  if (!sentMessage || !sentMessage.createMessageComponentCollector) return;
  try {
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180000,
    });
    collector.on('collect', async (menuInteraction) => {
      if (menuInteraction.user.id !== ctx.userId) {
        return menuInteraction.reply({ content: '{emoji:circlex} هذه القائمة ليست لك.', ephemeral: true });
      }
      const selected = menuInteraction.values[0];
      const newRow = buildHelpMenu(selected);

      if (selected === HELP_MAIN_VALUE) {
        return menuInteraction.update({ embeds: [buildHelpMainEmbed()], components: [newRow] });
      }

      const category = HELP_CATEGORIES.find((c) => c.value === selected);
      if (!category) return menuInteraction.reply({ content: '{emoji:circlex} قسم غير معروف.', ephemeral: true });

      return menuInteraction.update({ embeds: [buildHelpCategoryEmbed(category)], components: [newRow] });
    });
  } catch {
    /* تجاهل */
  }
}

/* ============================================================
 *  نقاط الدخول (سلاش + بريفكس)
 * ============================================================ */

module.exports = {
  data,
  name: 'bank',
  aliases: ['بنك', 'بانك'],
  description: 'نظام البنك والألعاب المالية',

  // نقطة الدخول للسلاش كوماند
  async execute(interaction) {
    const ctx = buildCtxFromInteraction(interaction);
    return runBank(ctx);
  },

  // نقطة الدخول لأوامر البريفكس — استدعِها من معالج الرسائل هكذا:
  // if (commandName === 'bank') await bankCommand.run(message, args);
  async run(message, args) {
    const ctx = await buildCtxFromMessage(message, args || []);
    return runBank(ctx);
  },
};