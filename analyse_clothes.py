import json
from collections import defaultdict
from pypinyin import lazy_pinyin

# 读取 clothes.json 文件
with open("clothes.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# 用字典统计：key = 名字，value = set(url)
name_dict = defaultdict(set)

for item in data:
    name = item.get("name", "").strip()
    url = item.get("url", "").strip()
    if name and url:
        name_dict[name].add(url)

# 找出名字相同但 URL 数量大于 1 的衣服
duplicates = {name: urls for name, urls in name_dict.items() if len(urls) != 2}

# 如果没有重复的名字
if not duplicates:
    print("没有找到名字重复但 URL 不同的衣服。")
    exit()

# 按中文名字的拼音排序
sorted_duplicates = sorted(duplicates.items(), key=lambda x: lazy_pinyin(x[0]))

# 输出结果
print("以下衣服名字相同，但对应了多套不同衣服：")
for name, urls in sorted_duplicates:
    print(f"\n衣服名: {name} （共 {len(urls)} 套）")
    for url in sorted(urls):
        print(f"  - {url}")
