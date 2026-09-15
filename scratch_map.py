import re
import os
import json

frontend_dir = r'frontend/src'
data_js_path = os.path.join(frontend_dir, 'data.js')

with open(data_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match standard objects: id: 'XYZ', ... address: '%DB...'
pattern = re.compile(r"id:\s*'([^']+)'(?:[^}]+)address:\s*'([^']+)'")
matches = pattern.findall(content)

mapping = {}
for id_val, addr_val in matches:
    if addr_val.startswith('%DB'):
        mapping[addr_val] = id_val

# Also let's extract VFDs
# VFD1_SP: { id: 'VFD1_SP', ... address: '%DB3.DBD30' }
vfd_pattern = re.compile(r"id:\s*'([^']+)'(?:[^}]+)address:\s*'([^']+)'")
for id_val, addr_val in vfd_pattern.findall(content):
    if addr_val.startswith('%DB'):
        mapping[addr_val] = id_val

# The user explicitly said:
# Reception temperatures: TT1, TT2, TT3, TT4, TT5, TT6, TT7, TT8
# Pasteurizer analog: AI1, AI2, AI3
# Flow meters: FM1, FM2, FM3
mapping['%DB3.DBD406'] = 'TT1'
mapping['%DB3.DBD428'] = 'TT2'
mapping['%DB3.DBD450'] = 'TT3'
mapping['%DB3.DBD472'] = 'TT4'
mapping['%DB3.DBD494'] = 'TT5'
mapping['%DB3.DBD516'] = 'TT6'

mapping['%DB3.DBD538'] = 'FM1'
mapping['%DB3.DBD560'] = 'FM2'

mapping['%DB1.DBD204'] = 'AI1'
mapping['%DB1.DBD208'] = 'AI2'
mapping['%DB1.DBD212'] = 'AI3'
mapping['%DB1.DBD216'] = 'AI4'
mapping['%DB1.DBD220'] = 'AI5'
mapping['%DB1.DBD224'] = 'AI6'
mapping['%DB1.DBD228'] = 'AI7'
mapping['%DB1.DBD232'] = 'AI8'

# Write out the mapping
print(json.dumps(mapping, indent=2))

# Now iterate over ALL files in frontend/src and replace these addresses
for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                file_content = f.read()
            
            new_content = file_content
            
            # For each mapping, replace the S7 address with the new ID
            for addr, new_tag in mapping.items():
                new_content = new_content.replace(addr, new_tag)
                
            # Also fix AppContext.jsx and api.js PAST_AI1 etc
            # Replace PAST_AI1 with AI1, etc.
            if file == 'api.js':
                # Remove TAG_ADDRESSES completely since we use `mapping.values()` directly!
                pass
            
            if new_content != file_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")
