import json
with open('nodered/flows.json', 'r') as f: flows = json.load(f)

for n in flows:
    if n.get('type') == 'function' and n.get('name', '').startswith('Format '):
        old_func = n['func']
        if 'for (const [name, addr] of Object.entries(addrMap)) {' in old_func:
            # Replace the loop
            new_loop = """
for (const [name, val] of Object.entries(d)) {
  if (val !== undefined && val !== null) {
    const addr = addrMap[name] || name;
    points.push({
      measurement: 'scada_tags',
      tags:   { system: '%s', tag_name: addr },
      fields: { value: typeof val === 'boolean' ? (val ? 1 : 0) : parseFloat(val) }
    });
  }
}
"""
            sys_name = 'reception'
            if 'Pasteurizer' in n['name']: sys_name = 'pasteurizer'
            elif 'CIP' in n['name']: sys_name = 'cip'
            
            new_func = old_func.split('const points = [];')[0] + 'const points = [];\n' + new_loop % sys_name + 'msg.payload = points;\nreturn msg;'
            n['func'] = new_func

with open('nodered/flows.json', 'w') as f: json.dump(flows, f, indent=4)
print("Updated Format functions in flows.json")
