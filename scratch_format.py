import re
import os

frontend_dir = r'frontend/src'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    
    # 1. getLive('TAG').toFixed(X)
    new_content = re.sub(
        r"getLive\((['\w\.%\?]+)\)\.toFixed\((\d+)\)", 
        r"(liveParams[\1] != null ? Number(liveParams[\1]).toFixed(\2) : '—')", 
        new_content
    )
    
    # 2. getLive('TAG').toLocaleString()
    new_content = re.sub(
        r"getLive\((['\w\.%\?]+)\)\.toLocaleString\(\)", 
        r"(liveParams[\1] != null ? Number(liveParams[\1]).toLocaleString() : '—')", 
        new_content
    )
    
    # 3. Handle cases where it's used inside JSX directly like {getLive('TAG')}
    # We will ONLY target {getLive('TAG')} (with nothing else around it except spaces)
    # Actually, the user specifically mentioned "For tile/gauge displays..."
    # The .toFixed and .toLocaleString covers 90% of them. Let's see if there are any others.
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated formats in {filepath}")

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))

