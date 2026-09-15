import os, re

d = r'frontend/src'
RADXA = 'http://192.168.1.100:5000'
LOCAL  = 'http://localhost:5000'
ENV_EXPR = "(import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000')"

for root, _, files in os.walk(d):
    for f in files:
        if not (f.endswith('.jsx') or f.endswith('.js')):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8') as fp:
            content = fp.read()

        new = content
        # 1. single-quote string literal
        new = new.replace(f"'{RADXA}'", ENV_EXPR)
        # 2. double-quote string literal
        new = new.replace(f'"{RADXA}"', ENV_EXPR)
        # 3. backtick template literal start
        new = new.replace(f'`{RADXA}', '`${import.meta.env.VITE_IIH_BASE_URL || "http://localhost:5000"}')

        if new != content:
            with open(path, 'w', encoding='utf-8') as fp:
                fp.write(new)
            print(f'Fixed: {f}')

print("Done.")
