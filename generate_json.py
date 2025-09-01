import re
import json
import os
import shutil

# 读取文件
md_file = "HPMA_database.md"
with open(md_file, "r", encoding="utf-8") as f:
    content = f.read()

# 按服装名称拆分
names = content.split("\n### ")[1:]

result = []

# 记录已用文件名，避免重复
used_names = set()
assets_folder = "./HPMA_database.assets"

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
    
    def rename(caption, old_path, md_content):
        base_name = re.sub(r'[\/:*?"<>|#]', "_", caption)
        ext = os.path.splitext(old_path)[1]
        new_name = base_name + ext
        
        # 如果文件名重复，自动加序号
        counter = 1
        while new_name in used_names:
            new_name = f"{base_name}-{counter}{ext}"
            counter += 1
            
        new_path = f"./HPMA_database.assets/{new_name}"
        
        # 重命名图片
        if os.path.exists(old_path):
            shutil.move(old_path, new_path)
            print(f"{old_path} -> {new_path}")
        
        # 替换 Markdown 内容中的路径
        md_content = md_content.replace(old_path, new_path)
        
        used_names.add(new_name)
        
        return md_content, new_path
    
    images = []
    for caption, old_path in images_matches:
        content, new_path = rename(caption, old_path, content)
        images.append({"name": caption, "url": new_path})
        
    # 条漫 URL
    comic_matches = block.split("#### 条漫")[-1].strip()
    comic_urls = ""
    if "![" in comic_matches:
        comic_urls = re.findall(r"!\[.*?\]\((.+?)\)", comic_matches)[0]
        comic_caption = f"{name}-条漫"
        content, comic_urls = rename(comic_caption, comic_urls, content)
        content = content.replace(comic_matches, f"![{comic_caption}]({comic_urls})")
    
    result.append({
        "name": name,
        "date": date,
        "type": type_,
        "images": images,
        "cartoon": comic_urls
    })

# 保存修改后的 Markdown
with open(md_file, "w", encoding="utf-8") as f:
    f.write(content)

# 输出 JSON
with open("hpma_database.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=4)

print("转换完成，已生成 hpma_database.json")
