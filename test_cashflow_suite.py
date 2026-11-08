import json
import urllib.request
import time

url = "http://127.0.0.1:8004/api/assistant/chat"

def ask(msg, conv_id="test_suite", lang="en"):
    payload = {"message": msg, "language": lang, "conversation_id": conv_id}
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))

print("=== RUNNING CASH FLOW ACCEPTANCE SUITE ===")

# Test 1: Basic concept explanation
res1 = ask("What is cash flow and how does it work?", "test_cf_1")
print("[Test 1: Concept] Module:", res1.get("module_id"), "| Reply length:", len(res1.get("reply","")))

# Test 2: Calculate cash flow (₹80k in, ₹65k out -> ₹15k net)
res2 = ask("My monthly income is ₹80,000 and my expenses are ₹65,000. Explain my cash flow.", "test_cf_2")
mr2 = res2.get("module_result", {})
print("[Test 2: Net Cash Flow] Net:", mr2.get("net_cash_flow"), "| Closing:", mr2.get("closing_balance"), "| Status:", mr2.get("status"))

# Test 3: Negative cash flow (₹50k in, ₹60k out -> -₹10k)
res3 = ask("My income is ₹50,000, but my expenses are ₹60,000. What should I do?", "test_cf_3")
mr3 = res3.get("module_result", {})
print("[Test 3: Deficit Risk] Net:", mr3.get("net_cash_flow"), "| Status:", mr3.get("status"), "| Risks:", len(mr3.get("risks",[])))

# Test 4: Follow-up memory
cid4 = f"test_cf_mem_{int(time.time())}"
t1 = ask("My income is ₹1,00,000 per month.", cid4)
print("[Test 4: Step 1] Module:", t1.get("module_id"), "| Partial:", t1.get("module_result",{}).get("type"))
t2 = ask("My expenses are ₹75,000.", cid4)
print("[Test 4: Step 2] Net:", t2.get("module_result",{}).get("net_cash_flow"))
t3 = ask("What if my expenses increase by ₹10,000?", cid4)
mr4_3 = t3.get("module_result",{})
print("[Test 4: Step 3 What-If] Sim Net:", mr4_3.get("simulated",{}).get("net_cash_flow"), "| Base Net:", mr4_3.get("baseline",{}).get("net_cash_flow"))

# Test 6: Cash balance calculation
res6 = ask("My opening balance is ₹40,000. My income is ₹80,000 and my expenses are ₹65,000. What is my closing balance?", "test_cf_6")
mr6 = res6.get("module_result",{})
print("[Test 6: Closing Balance] Closing:", mr6.get("closing_balance"), "| Opening:", mr6.get("opening_balance"))

# Test 7: Forecast
res7 = ask("Predict my cash flow for the next three months.", "test_cf_7")
mr7 = res7.get("module_result",{})
print("[Test 7: Forecast] Type:", mr7.get("type"), "| Projected rows:", len(mr7.get("rows",[])))

# Test 8: Sales drop scenario
res8 = ask("What happens if my sales decrease by 20%?", cid4)
mr8 = res8.get("module_result",{})
print("[Test 8: What-If Sales] Sim Income:", mr8.get("simulated",{}).get("income"), "| Sim Net:", mr8.get("simulated",{}).get("net_cash_flow"))

# Test 9: Multilingual (Tamil)
res9 = ask("என்னுடைய வருமானத்தை விட செலவு அதிகமாக இருக்கிறது. ஏன்?", "test_cf_ta", "ta")
print("[Test 9: Tamil] Module:", res9.get("module_id"), "| Reply length:", len(res9.get("reply","")))

# Test 10: Multilingual (Telugu)
res10 = ask("నా ఆదాయం కంటే ఖర్చులు ఎక్కువగా ఉన్నాయి. దీన్ని ఎలా సరిచేయాలి?", "test_cf_te", "te")
print("[Test 10: Telugu] Module:", res10.get("module_id"), "| Reply length:", len(res10.get("reply","")))

# Test 11: Update previous details
res11 = ask("Actually, my monthly income is ₹90,000 instead of ₹1,00,000.", cid4)
mr11 = res11.get("module_result",{})
print("[Test 11: Updated Income] New Net:", mr11.get("net_cash_flow"), "| Income:", mr11.get("income"), "| Expenses:", mr11.get("expenses"))

print("=== ALL SUITE CHECKS COMPLETE ===")

