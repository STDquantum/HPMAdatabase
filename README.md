# HPMA 图鉴

`get_cangbaoge.js` 从本目录的 `装饰.html` 整理装饰分类，并读取 `E:\download\hpma\HPMA\卡牌网页整理\卡牌信息.json` 中的静态卡牌数据，生成合并后的 `clothes.json` 和首页 `index.html`。卡牌不会从 HTML 解析。

首页提供全部分类筛选和名称搜索。装饰图片下载到 `clothes/` 的分类目录；卡牌原图、边框、魔力数字和熟练度素材复制到 `clothes/cards/background/`。页面只引用本地图片。

## 更新图鉴

1. 将最新藏宝阁装饰页面 HTML 保存为 `装饰.html`，放在本目录。
2. 确认卡牌资料仍位于 `E:\download\hpma\HPMA\卡牌网页整理`，其中包含 `卡牌信息.json` 和 `background/` 素材目录。
3. 首次运行安装依赖：

   ```powershell
   npm install
   ```

4. 在本目录运行：

   ```powershell
   node get_cangbaoge.js
   ```

脚本会以当前 `装饰.html` 重建装饰数据，并把卡牌静态 JSON 合并进去。`clothes.json` 每条装饰记录包含类别、名称和本地图片路径；卡牌记录还包含卡牌类型、品质、魔力消耗及本地卡面、边框等路径。已下载的装饰图片会复用。

## 注意

- 请从 `HPMAdatabase` 目录运行脚本；输入文件名必须是 `装饰.html`。
- 更新卡牌数据时直接编辑卡牌整理目录中的 `卡牌信息.json`；脚本不解析 `卡牌合成.html` 或其他卡牌 HTML。
- `test1.html` 不再使用；装饰数据来源是 `装饰.html`。
