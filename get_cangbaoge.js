const fs = require('fs');
const { JSDOM } = require('jsdom');

// ========== 第一步：解析 test.html ==========
const html = fs.readFileSync('test1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const items = document.querySelectorAll('.icon-item');
const newData = [];

items.forEach(item => {
    const img = item.querySelector('.img');
    const nameSpan = item.querySelector('.cqm-text.icon-label');

    if (img && nameSpan) {
        newData.push({
            name: nameSpan.textContent.trim(),
            url: img.getAttribute('src')
        });
    }
});

console.log(`解析到新数据 ${newData.length} 条`);

// ========== 第二步：读取已有的 clothes.json ==========
let oldData = [];
if (fs.existsSync('clothes.json')) {
    try {
        oldData = JSON.parse(fs.readFileSync('clothes.json', 'utf8'));
        console.log(`读取到旧数据 ${oldData.length} 条`);
    } catch (err) {
        console.error('读取 clothes.json 出错，重置为空：', err);
        oldData = [];
    }
}

// ========== 第三步：合并数据（去重） ==========
// 用 Map 来判断重复，key 为 name + url
const mergedMap = new Map();

// 先放入旧数据
oldData.forEach(item => {
    const key = `${item.name}|${item.url}`;
    mergedMap.set(key, item);
});

// 再放入新数据（自动覆盖同名同url）
newData.forEach(item => {
    const key = `${item.name}|${item.url}`;
    mergedMap.set(key, item);
});

// 合并后的数组
const mergedData = Array.from(mergedMap.values());

// 按 name 字母顺序排序，再按 url 字母逆序排序
const sortedData = mergedData.sort((a, b) => {
    if (a.name === b.name) {
        return b.url.localeCompare(a.url); // url 逆序
    }
    return a.name.localeCompare(b.name); // name 正序
});

// ========== 第四步：写回 clothes.json ==========
fs.writeFileSync('clothes.json', JSON.stringify(sortedData, null, 2), 'utf8');
console.log(`合并完成！当前总数据 ${sortedData.length} 条`);

// ========== 第五步：生成展示 HTML ==========
let htmlOutput = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>衣服展示</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 20px;
      background: #f9f9f9;
    }
    .container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 20px;
    }
    .item {
      text-align: center;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .item img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }
    .item span {
      display: block;
      margin-top: 8px;
      font-size: 14px;
      color: #333;
    }
  </style>
</head>
<body>
  <h1>衣服展示</h1>
  <div class="container">
`;

sortedData.forEach(cloth => {
    htmlOutput += `
    <div class="item">
      <img src="${cloth.url}" alt="${cloth.name}">
      <span>${cloth.name}</span>
    </div>
  `;
});

htmlOutput += `
  </div>
</body>
</html>
`;

fs.writeFileSync('clothes.html', htmlOutput, 'utf8');
console.log('展示页面已生成：clothes.html');
