import os
import re
import shutil

md_file = "HPMA_database.md"
assets_folder = "./HPMA_database.assets"

# 读取 Markdown 内容
with open(md_file, "r", encoding="utf-8") as f:
    content = f.read()

# 匹配 Markdown 图片语法
pattern = r"!\[(.*?)\]\(\.\/HPMA_database\.assets\/(.*?)\)"
matches = re.findall(pattern, content)

# 记录已用文件名，避免重复
used_names = set()

for alt_text, filename in matches:
    old_path = os.path.join(assets_folder, filename)
    # 构造安全文件名
    base_name = re.sub(r'[\/:*?"<>|#]', "_", alt_text)
    ext = os.path.splitext(filename)[1]
    new_name = base_name + ext
    
    # 如果文件名重复，自动加序号
    counter = 1
    while new_name in used_names:
        new_name = f"{base_name}-{counter}{ext}"
        counter += 1

    new_path = os.path.join(assets_folder, new_name)
    
    # 重命名图片
    if os.path.exists(old_path):
        shutil.move(old_path, new_path)
        print(f"{old_path} -> {new_path}")
    
    # 替换 Markdown 内容中的路径
    content = content.replace(f"./HPMA_database.assets/{filename}", f"./HPMA_database.assets/{new_name}")
    
    used_names.add(new_name)

# 保存修改后的 Markdown
with open(md_file, "w", encoding="utf-8") as f:
    f.write(content)

print("图片重命名完成，Markdown 文件已更新。")
