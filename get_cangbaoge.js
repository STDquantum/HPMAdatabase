// 从装饰.html 提取外观分类，并合并静态卡牌数据，生成本地图片、clothes.json 和 index.html。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const INPUT = path.join(ROOT, '装饰.html');
const DATA_FILE = path.join(ROOT, 'clothes.json');
const OUTPUT_HTML = path.join(ROOT, 'index.html');
const IMAGE_ROOT = path.join(ROOT, 'clothes');
const CARD_SOURCE_ROOT = path.resolve(ROOT, '..', 'HPMA', '卡牌网页整理');
const CARD_INFO_FILE = path.join(CARD_SOURCE_ROOT, '卡牌信息.json');
const CARD_BACKGROUND_SOURCE = path.join(CARD_SOURCE_ROOT, 'background');
const CARD_BACKGROUND_DEST = path.join(IMAGE_ROOT, 'cards', 'background');
const CARD_ASSET_PREFIX = 'clothes/cards/background';
const CATEGORIES = {
    '卡牌皮肤': 'card-skins',
    '魔杖': 'wands',
    '飞天扫帚': 'brooms',
    '服装': 'outfits',
    '头饰': 'headwear',
    '发型': 'hairstyles',
    '救援动物': 'rescue-animals',
    '跟随宠物': 'companion-pets',
    '猫头鹰': 'owls',
    '头像框': 'avatar-frames',
    '妆容配饰': 'makeup-accessories',
    '床铺': 'beds',
    '家具': 'furniture'
};

if (!fs.existsSync(INPUT)) {
    console.error('找不到 装饰.html，请先将藏宝阁装饰页面 HTML 放到项目目录。');
    process.exit(1);
}
if (!fs.existsSync(CARD_INFO_FILE) || !fs.existsSync(CARD_BACKGROUND_SOURCE)) {
    console.error(`找不到卡牌静态数据或素材目录：${CARD_SOURCE_ROOT}`);
    process.exit(1);
}

const document = new JSDOM(fs.readFileSync(INPUT, 'utf8')).window.document;
const dataByKey = new Map();

for (const label of document.querySelectorAll('.cqm-wrap')) {
    const category = label.textContent.replace(/^\s*•\s*/, '').trim();
    if (!Object.hasOwn(CATEGORIES, category)) continue;

    const list = label.nextElementSibling;
    if (!list) continue;

    for (const item of list.querySelectorAll('.icon-item')) {
        const image = item.querySelector('.img');
        const name = item.querySelector('.cqm-text.icon-label')?.textContent.trim();
        const sourceUrl = image?.getAttribute('src');
        if (!name || !sourceUrl || !/^https?:\/\//i.test(sourceUrl)) continue;

        const key = `${category}|${name}|${sourceUrl}`;
        dataByKey.set(key, { category, name, sourceUrl });
    }
}

const records = [...dataByKey.values()].sort((a, b) =>
    a.category.localeCompare(b.category, 'zh') ||
    a.name.localeCompare(b.name, 'zh') ||
    a.sourceUrl.localeCompare(b.sourceUrl)
);

if (!records.length) {
    console.error('没有从 装饰.html 中找到支持的外观条目。');
    process.exit(1);
}

const cardSource = JSON.parse(fs.readFileSync(CARD_INFO_FILE, 'utf8'));
const cardRecords = Object.entries(cardSource).map(([id, card]) => {
    const artFile = `${card['素材名']}.png`;
    const frameFile = `${card['类型']}_${card['品质']}.png`;
    const numericCost = card['魔力消耗'] === '' || card['魔力消耗'] == null
        ? null
        : Number(card['魔力消耗']);
    return {
        id,
        category: '卡牌',
        name: card['显示名称'],
        sourceUrl: card['卡片url'],
        localPath: `${CARD_ASSET_PREFIX}/${artFile}`,
        cardType: card['类型'],
        rarity: card['品质'],
        cost: Number.isFinite(numericCost) ? numericCost : null,
        order: card['顺序'],
        framePath: `${CARD_ASSET_PREFIX}/${frameFile}`,
        costPath: Number.isFinite(numericCost)
            ? `${CARD_ASSET_PREFIX}/card_num_${numericCost}.png`
            : null,
        masteryPath: card['熟练度url'] ? `${CARD_ASSET_PREFIX}/shuliandu.png` : null,
        frameUrl: card['框url'],
        costUrl: card['魔力url'],
        masteryUrl: card['熟练度url']
    };
});

for (const card of cardRecords) {
    for (const relativePath of [card.localPath, card.framePath, card.costPath, card.masteryPath].filter(Boolean)) {
        if (!fs.existsSync(path.join(CARD_BACKGROUND_SOURCE, path.basename(relativePath)))) {
            console.error(`卡牌素材缺失：${path.basename(relativePath)}`);
            process.exit(1);
        }
    }
}

const allRecords = [...records, ...cardRecords];

function extensionFor(url) {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return /^\.(png|jpe?g|webp|gif|avif)$/.test(ext) ? ext : '.img';
}

function localPathFor(category, url) {
    const hash = crypto.createHash('sha1').update(url).digest('hex');
    return `clothes/${CATEGORIES[category]}/${hash}${extensionFor(url)}`;
}

for (const record of records) record.localPath = localPathFor(record.category, record.sourceUrl);

const uniqueImages = new Map(records.map(record => [record.localPath, record.sourceUrl]));
const queue = [...uniqueImages.entries()];
let downloaded = 0;
let reused = 0;
const failures = [];

async function worker() {
    while (queue.length) {
        const [relativePath, url] = queue.pop();
        const destination = path.join(ROOT, relativePath);
        if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
            reused++;
            continue;
        }

        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const bytes = Buffer.from(await response.arrayBuffer());
            if (!bytes.length) throw new Error('空文件');
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.writeFileSync(destination, bytes);
            downloaded++;
        } catch (error) {
            failures.push({ url, error: error.message });
            console.error(`下载失败 ${url}: ${error.message}`);
        }
    }
}

async function main() {
    fs.cpSync(CARD_BACKGROUND_SOURCE, CARD_BACKGROUND_DEST, { recursive: true });
    await Promise.all(Array.from({ length: 8 }, () => worker()));

    if (failures.length) {
        console.error(`有 ${failures.length} 张图片下载失败；为避免生成缺图页面，本次不写入 clothes.json 和 index.html。`);
        process.exitCode = 1;
        return;
    }

    fs.writeFileSync(DATA_FILE, `${JSON.stringify(allRecords, null, 2)}\n`, 'utf8');
    const categories = [...Object.keys(CATEGORIES), '卡牌'];
    const buttons = ['全部', ...categories].map((name, index) =>
        `<button class="filter${index === 0 ? ' active' : ''}" data-category="${index === 0 ? 'all' : name}">${name}</button>`
    ).join('\n      ');

    const cards = allRecords.map(record => {
        if (record.category === '卡牌') {
            const mastery = record.masteryPath
                ? `<img class="card-mastery" src="${record.masteryPath}" alt="熟练度">`
                : '';
            const cost = record.costPath
                ? `<img class="card-cost" src="${record.costPath}" alt="魔力消耗 ${record.cost}">`
                : '';
            const costLabel = record.cost == null ? '' : ` · ${record.cost} 费`;
            return `
      <article class="card game-card" data-category="卡牌" data-type="${record.cardType}" data-name="${escapeHtml(record.name.toLowerCase())}">
        <div class="card-visual">
          <img class="card-art" src="${record.localPath}" alt="${escapeHtml(record.name)}" loading="lazy">
          <img class="card-frame" src="${record.framePath}" alt="" loading="lazy">
          ${mastery}${cost}
        </div>
        <div class="card-name">${escapeHtml(record.name)}</div>
        <div class="card-category">${record.cardType} · ${record.rarity}${costLabel}</div>
      </article>`;
        }
        return `
      <article class="card" data-category="${record.category}" data-name="${escapeHtml(record.name.toLowerCase())}">
        <img src="${record.localPath}" alt="${escapeHtml(record.name)}" loading="lazy">
        <div class="card-name">${escapeHtml(record.name)}</div>
        <div class="card-category">${record.category}</div>
      </article>`;
    }).join('');

    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HPMA 外观图鉴</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, "Microsoft YaHei", sans-serif; font-size: 19.6px; background: #f5f6f8; color: #222; }
    body { margin: 0; padding: 24px; }
    header { position: sticky; top: 0; z-index: 10; margin: -24px -24px 20px; padding: 18px 24px; background: #ffffffed; border-bottom: 1px solid #e5e7eb; backdrop-filter: blur(10px); }
    h1 { margin: 0 0 14px; font-size: 24px; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .filter { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 999px; background: white; cursor: pointer; font-size: 14px; }
    .filter.active { color: white; background: #5b54c7; border-color: #5b54c7; }
    #search { min-width: 180px; margin-left: auto; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    #summary { margin: 14px 0; color: #666; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 14px; }
    .card { overflow: hidden; padding: 10px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; text-align: center; }
    .card img { display: block; width: 100%; aspect-ratio: 1; object-fit: contain; }
    .card.game-card { position: relative; z-index: 0; isolation: isolate; overflow: visible; }
    .card.game-card .card-visual { position: relative; z-index: 0; isolation: isolate; width: 100%; aspect-ratio: 135.438 / 194.688; margin: 0 auto 7px; overflow: visible; }
    .card .card-visual img { position: absolute; display: block; aspect-ratio: auto; object-fit: contain; }
    .card .card-art { z-index: 1; left: 4%; top: 10%; width: 92%; height: auto; }
    .card .card-frame { z-index: 2; inset: 0; width: 100%; height: auto; }
    .card .card-mastery, .card .card-cost { z-index: 3; height: auto; }
    .card .card-mastery { left: -.2rem; top: 0; width: .9rem; }
    .card .card-cost { left: -.1rem; top: .65rem; width: .7rem; }
    .card-name { margin-top: 8px; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
    .card-category { margin-top: 4px; color: #777; font-size: 12px; }
    .card.game-card .card-name { display: flow-root; width: 100%; min-height: 42px; margin-top: 0; color: #1e1e1e; font-size: 16.8px; line-height: 21px; text-align: center; }
    .card.game-card .card-category { margin-top: 0; color: #777; font-size: 14px; line-height: 1.45; }
    .card[hidden] { display: none; }
    @media (max-width: 560px) { body { padding: 14px; } header { margin: -14px -14px 16px; padding: 14px; } #search { flex: 1 1 100%; margin-left: 0; } }
  </style>
</head>
<body>
  <header>
    <h1>HPMA 外观图鉴</h1>
    <div class="toolbar">${buttons}<input id="search" type="search" placeholder="搜索名称…" aria-label="搜索名称"></div>
  </header>
  <p id="summary"></p>
  <main class="grid">${cards}
  </main>
  <script>
    const buttons = [...document.querySelectorAll('.filter')];
    const cards = [...document.querySelectorAll('.card')];
    const search = document.querySelector('#search');
    const summary = document.querySelector('#summary');
    let selected = 'all';
    function update() {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      for (const card of cards) {
        const show = (selected === 'all' || card.dataset.category === selected) && card.dataset.name.includes(query);
        card.hidden = !show;
        if (show) visible++;
      }
      summary.textContent = '显示 ' + visible + ' / ' + cards.length + ' 项';
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      selected = button.dataset.category;
      buttons.forEach(item => item.classList.toggle('active', item === button));
      update();
    }));
    search.addEventListener('input', update);
    update();
  </script>
</body>
</html>`;

    fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
    console.log(`整理完成：${records.length} 条装饰记录、${cardRecords.length} 张卡牌；下载 ${downloaded} 张装饰图片，复用 ${reused} 张本地图片。`);
    for (const category of categories) {
        console.log(`${category}: ${allRecords.filter(record => record.category === category).length} 条`);
    }
    console.log('已生成 clothes.json 和 index.html。');
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
