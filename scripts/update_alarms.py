import re

new_alarms = """
ALARM_CONDITIONS = [
    # ── MILK RECEPTION ALARMS (Latched, read from Node-RED individual bits) ──
    {"id": "ALM-REC-ESTOP", "tag": "REC_ALM_ESTOP", "check": lambda v: v == 1, "severity": "critical", "source": "Reception (DB8)", "category": "Safety", "desc_fn": lambda v: "Emergency Stop"},
    {"id": "ALM-REC-AIR", "tag": "REC_ALM_AIR", "check": lambda v: v == 1, "severity": "critical", "source": "Reception (DB8)", "category": "Equipment", "desc_fn": lambda v: "Air Pressure Fail"},
    {"id": "ALM-REC-SPP", "tag": "REC_ALM_SPP", "check": lambda v: v == 1, "severity": "critical", "source": "Reception (DB8)", "category": "Equipment", "desc_fn": lambda v: "SPP Feedback Fail"},
    {"id": "ALM-REC-RCM-HI", "tag": "REC_ALM_RCM_HI", "check": lambda v: v == 1, "severity": "warning", "source": "Reception (DB8)", "category": "Process", "desc_fn": lambda v: "RCM Tank High Level"},
    {"id": "ALM-REC-RMST-HI", "tag": "REC_ALM_RMST_HI", "check": lambda v: v == 1, "severity": "warning", "source": "Reception (DB8)", "category": "Process", "desc_fn": lambda v: "RMST Tank High Level"},
    {"id": "ALM-REC-SEP", "tag": "REC_ALM_SEP", "check": lambda v: v == 1, "severity": "critical", "source": "Reception (DB8)", "category": "Equipment", "desc_fn": lambda v: "Cream Separator Trip"},
    {"id": "ALM-REC-VENT", "tag": "REC_ALM_VENTURI", "check": lambda v: v == 1, "severity": "critical", "source": "Reception (DB8)", "category": "Equipment", "desc_fn": lambda v: "Venturi Pump Trip"},
    {"id": "ALM-REC-RCM-AGIT", "tag": "REC_ALM_RCM_AGIT", "check": lambda v: v == 1, "severity": "warning", "source": "Reception (DB8)", "category": "Equipment", "desc_fn": lambda v: "RCM Agitator Trip"},
    {"id": "ALM-REC-RMST-AGIT", "tag": "REC_ALM_RMST_AGIT", "check": lambda v: v == 1, "severity": "warning", "source": "Reception (DB8)", "category": "Equipment", "desc_fn": lambda v: "RMST Agitator Trip"},
    {"id": "ALM-REC-CHILL", "tag": "REC_ALM_CHILL", "check": lambda v: v == 1, "severity": "critical", "source": "Reception (DB8)", "category": "Equipment", "desc_fn": lambda v: "Chilled Water Pump Trip"},

    # ── PASTEURIZER ALARMS (Latched, read from Node-RED individual bits) ──
    {"id": "ALM-PAST-ESTOP", "tag": "PAST_ALM_ESTOP", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Safety", "desc_fn": lambda v: "Emergency Stop PB"},
    {"id": "ALM-PAST-AIR", "tag": "PAST_ALM_AIR", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Equipment", "desc_fn": lambda v: "Air Pressure Low"},
    {"id": "ALM-PAST-FEED-FB", "tag": "PAST_ALM_FEED_FB", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Equipment", "desc_fn": lambda v: "Feed Pump ON Feedback Failed"},
    {"id": "ALM-PAST-FEED-TRIP", "tag": "PAST_ALM_FEED_TRIP", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Equipment", "desc_fn": lambda v: "Feed Pump Trip"},
    {"id": "ALM-PAST-PMST-FB", "tag": "PAST_ALM_PMST_FB", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Equipment", "desc_fn": lambda v: "PMST Pump Feedback Failed"},
    {"id": "ALM-PAST-PMST-AGIT", "tag": "PAST_ALM_PMST_AGIT", "check": lambda v: v == 1, "severity": "warning", "source": "Pasteurizer (DB32)", "category": "Equipment", "desc_fn": lambda v: "PMST Agitator Feedback Failed"},
    {"id": "ALM-PAST-HOMO-FS", "tag": "PAST_ALM_HOMO_FS", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Equipment", "desc_fn": lambda v: "Homogenizer Flow Switch Fault"},
    {"id": "ALM-PAST-FLOW", "tag": "PAST_ALM_FLOW", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Past Flow Fault"},
    {"id": "ALM-PAST-LOW-LONG", "tag": "PAST_ALM_LOW_LONG", "check": lambda v: v == 1, "severity": "warning", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Low Level Long Time"},
    {"id": "ALM-PAST-BAL-HI", "tag": "PAST_ALM_BAL_HI", "check": lambda v: v == 1, "severity": "warning", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Balance Tank Level High"},
    {"id": "ALM-PAST-BAL-LO", "tag": "PAST_ALM_BAL_LO", "check": lambda v: v == 1, "severity": "warning", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Balance Tank Level Low"},
    {"id": "ALM-PAST-PMST-HI", "tag": "PAST_ALM_PMST_HI", "check": lambda v: v == 1, "severity": "warning", "source": "Pasteurizer (DB70)", "category": "Process", "desc_fn": lambda v: "PMST High Level Alarm"},
    {"id": "ALM-PAST-HOT-LO", "tag": "PAST_ALM_HOT_LO", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Past Hot Temp Low"},
    {"id": "ALM-PAST-HOT-HI", "tag": "PAST_ALM_HOT_HI", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Past Hot Temp High"},
    {"id": "ALM-PAST-OUT-LO", "tag": "PAST_ALM_OUT_LO", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Past Out Temp Low"},
    {"id": "ALM-PAST-OUT-HI", "tag": "PAST_ALM_OUT_HI", "check": lambda v: v == 1, "severity": "critical", "source": "Pasteurizer (DB32)", "category": "Process", "desc_fn": lambda v: "Past Out Temp High"},

    # ── CIP ALARMS (Latched, read from Words and checked via bitwise) ──
    {"id": "ALM-CIP-ESTOP", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<0)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Safety", "desc_fn": lambda v: "Emergency Stop"},
    {"id": "ALM-CIP-HW-FAULT", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<1)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Hot Water System Fault"},
    {"id": "ALM-CIP-AIR-LOW", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<2)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Air Pressure Low"},
    {"id": "ALM-CIP-SPRAY", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<3)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Spray Ball Fault"},
    {"id": "ALM-CIP-SUP-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<4)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Supply Pump Feedback Fail"},
    {"id": "ALM-CIP-RET-FS", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<6)) != 0, "severity": "warning", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v: "Return Flow Sensor Fault"},
    
    # Return Pumps
    {"id": "ALM-CIP-P1-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<8)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P1 Feedback Fail"},
    {"id": "ALM-CIP-P2-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<9)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P2 Feedback Fail"},
    {"id": "ALM-CIP-P3-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<10)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P3 Feedback Fail"},
    {"id": "ALM-CIP-P4-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<11)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P4 Feedback Fail"},
    {"id": "ALM-CIP-P5-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<12)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P5 Feedback Fail"},
    {"id": "ALM-CIP-P6-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<13)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P6 Feedback Fail"},
    {"id": "ALM-CIP-P7-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<14)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P7 Feedback Fail"},
    {"id": "ALM-CIP-P8-FB", "tag": "CIP_ALM_W0", "check": lambda w: (int(w) & (1<<15)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P8 Feedback Fail"},
    {"id": "ALM-CIP-P9-FB", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<6)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P9 Feedback Fail"},
    {"id": "ALM-CIP-P10-FB", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<7)) != 0, "severity": "critical", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Return Pump P10 Feedback Fail"},

    {"id": "ALM-CIP-BTD-LL", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<0)) != 0, "severity": "warning", "source": "CIP (DB32)", "category": "Equipment", "desc_fn": lambda v: "Butterfly Valve Low Limit Fail"},
    {"id": "ALM-CIP-RT-LL", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<1)) != 0, "severity": "warning", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v: "Return Temp Low Limit Fail"},
    {"id": "ALM-CIP-HT-LL", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<2)) != 0, "severity": "warning", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v: "Hot Temp Low Limit Fail"},
    {"id": "ALM-CIP-LT-LL", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<3)) != 0, "severity": "warning", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v: "Low Temp Low Limit Fail"},
    {"id": "ALM-CIP-AT-LL", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<4)) != 0, "severity": "warning", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v: "Acid Temp Low Limit Fail"},
    {"id": "ALM-CIP-SUP-FLOW-LO", "tag": "CIP_ALM_W1", "check": lambda w: (int(w) & (1<<8)) != 0, "severity": "warning", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v: "Supply Flow Too Low"},
]

# Add AI_01 to AI_16 analog alarms
ai_map = [
    (1, 2, 0, 1), (2, 2, 2, 3), (3, 2, 4, 5), (4, 2, 6, 7),
    (5, 2, 8, 9), (6, 2, 10, 11), (7, 2, 12, 13), (8, 2, 14, 15),
    (9, 3, 0, 1), (10, 3, 2, 3), (11, 3, 4, 5), (12, 3, 6, 7),
    (13, 3, 8, 9), (14, 3, 10, 11), (15, 3, 12, 13), (16, 3, 14, 15),
]
for (idx, word, lo_bit, hi_bit) in ai_map:
    ALARM_CONDITIONS.append({"id": f"ALM-CIP-AI{idx:02d}-LO", "tag": f"CIP_ALM_W{word}", "check": eval(f"lambda w: (int(w) & (1<<{lo_bit})) != 0"), "severity": "critical", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v, i=idx: f"AI_{i:02d} Low Limit"})
    ALARM_CONDITIONS.append({"id": f"ALM-CIP-AI{idx:02d}-HI", "tag": f"CIP_ALM_W{word}", "check": eval(f"lambda w: (int(w) & (1<<{hi_bit})) != 0"), "severity": "critical", "source": "CIP (DB32)", "category": "Process", "desc_fn": lambda v, i=idx: f"AI_{i:02d} High Limit"})
"""

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
alarms_file = os.path.join(ROOT_DIR, 'backend', 'routers', 'alarms.py')

with open(alarms_file, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace ALARM_CONDITIONS list
start = code.find('ALARM_CONDITIONS = [')
if start != -1:
    end = code.find(']\n\n', start) + 1
    new_code = code[:start] + new_alarms.strip() + "\n" + code[end:]
    with open(alarms_file, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Rewrote ALARM_CONDITIONS in alarms.py")
else:
    print("Could not find ALARM_CONDITIONS block")
