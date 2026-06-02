import re

public_html_path = r"c:\Users\USER\Downloads\Security loadmap_Auto-20260529T052519Z-3-001\Security loadmap_Auto\public\index.html"
templates_html_path = r"c:\Users\USER\Downloads\Security loadmap_Auto-20260529T052519Z-3-001\Security loadmap_Auto\templates\index.html"

with open(public_html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace paths
content = content.replace('./css/style.css', '/static/css/style.css')
content = content.replace('./js/app.js', '/static/js/app.js')

with open(templates_html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Synchronized templates/index.html successfully!")
