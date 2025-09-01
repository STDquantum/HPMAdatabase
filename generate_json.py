import re
import json

# 读取文件
with open("hpma_database.md", "r", encoding="utf-8") as f:
    content = f.read()

# 按服装名称拆分
names = content.split("\n### ")[1:]

result = []

for idx, block in enumerate(names):
    if block[0] == "\n":
        continue
    
    name = block.split("\n")[0].strip()
    assert name, "服装名称不能为空"
    
    # 上线日期
    date_match = re.search(r"#### 上线日期\n\n(.+?)\n", block)
    date = date_match.group(1).strip() if date_match else ""
    
    # 类型
    type_match = re.search(r"#### 类型\n\n(.+?)\n", block)
    type_ = type_match.group(1).strip() if type_match else ""
    
    clothes_images = block.split("#### 条漫")[0].strip()
    images_matches = re.findall(r"!\[(.*?)\]\((.*?)\)", clothes_images)
    
    images = [{"name": m[0], "url": m[1]} for m in images_matches]
    
    # 条漫 URL
    comic_matches = block.split("#### 条漫")[-1].strip()
    
    comic_urls = re.findall(r"!\[.*?\]\((.+?)\)", comic_matches)[0] if "![" in comic_matches else ""
    
    result.append({
        "name": name,
        "date": date,
        "type": type_,
        "images": images,
        "cartoon": comic_urls
    })

# 输出 JSON
with open("hpma_database.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=4)

print("转换完成，已生成 hpma_database.json")
