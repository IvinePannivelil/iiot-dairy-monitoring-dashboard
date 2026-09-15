import json

new_vars = [
    {"addr":"DB3,REAL2","name":"TOT_RMST"},
    {"addr":"DB3,REAL10","name":"TT1"},
    {"addr":"DB3,REAL18","name":"TT2"},
    {"addr":"DB3,REAL26","name":"TT3"},
    {"addr":"DB3,REAL34","name":"TT4"},
    {"addr":"DB3,REAL42","name":"TT5"},
    {"addr":"DB3,REAL50","name":"TT6"},
    {"addr":"DB3,REAL58","name":"TT7"},
    {"addr":"DB3,REAL66","name":"TT8"},
    {"addr":"DB3,REAL74","name":"TT9"},
    {"addr":"DB3,REAL82","name":"TT10"},
    {"addr":"DB3,REAL90","name":"TT11"},
    {"addr":"DB3,REAL98","name":"TT12"},
    {"addr":"DB3,REAL106","name":"FM1"},
    {"addr":"DB3,REAL114","name":"FM2"},
    {"addr":"DB3,REAL140","name":"VFD1_HZ"},
    {"addr":"DB3,REAL362","name":"VFD2_HZ"}
]

with open('nodered/flows.json', 'r') as f:
    flows = json.load(f)

for node in flows:
    if node.get('id') == 's7-endpoint-rec':
        node['vartable'] = new_vars

with open('nodered/flows.json', 'w') as f:
    json.dump(flows, f, indent=4)
