"""
Cash Flow Engine for BioAsset Intelligence AI Voice Assistant.

Provides financial calculations, income/expense summaries, cash balances,
6-month forward forecasts, what-if scenario simulations, and risk warnings.
Follows ICAR/TNAU agricultural economics and standard accounting principles.
"""

from __future__ import annotations
from typing import Any
from datetime import datetime, date


def calculate_cashflow_summary(
    income: float = 0.0,
    expenses: float = 0.0,
    opening_balance: float = 0.0,
    loan_in: float = 0.0,
    loan_out: float = 0.0,
    period: str = "monthly",
    category_breakdown: dict[str, float] | None = None,
    receivables: float = 0.0,
    payables: float = 0.0,
    currency: str = "₹",
) -> dict[str, Any]:
    """
    Compute comprehensive cash flow summary.
    Distinguishes earned operating cash flow from financing loan movements.
    Formula:
      Net Cash Flow = (Earned Income + Loan In) - (Operating Expenses + Loan Out)
      Closing Balance = Opening Balance + Net Cash Flow
      Working Capital = Closing Balance + Outstanding Receivables - Outstanding Payables
    """
    income = float(income or 0.0)
    expenses = float(expenses or 0.0)
    opening_balance = float(opening_balance or 0.0)
    loan_in = float(loan_in or 0.0)
    loan_out = float(loan_out or 0.0)
    receivables = float(receivables or 0.0)
    payables = float(payables or 0.0)

    total_inflow = round(income + loan_in)
    total_outflow = round(expenses + loan_out)
    operating_net = round(income - expenses)
    net_cash_flow = round(total_inflow - total_outflow)
    closing_balance = round(opening_balance + net_cash_flow)

    # Available working capital & working capital cycle
    working_capital = round(closing_balance + receivables - payables)
    daily_sales = (income / 30.0) if income > 0 else 1.0
    dso_days = round(receivables / daily_sales) if receivables > 0 else 0
    daily_spend = (expenses / 30.0) if expenses > 0 else 1.0
    dpo_days = round(payables / daily_spend) if payables > 0 else 0
    wc_cycle_days = max(10, min(60, dso_days - dpo_days + 20)) if (receivables > 0 or payables > 0) else 25
    working_capital_cycle = f"{wc_cycle_days} days"

    # Status classification
    if net_cash_flow > 0:
        status = "Positive Surplus"
        status_color = "#2d6a4f"
        explanation = (
            f"You have a positive net cash flow of {currency}{net_cash_flow:,} for this {period}. "
            f"Your cash inflow exceeds your cash outflow, increasing your working capital."
        )
    elif net_cash_flow < 0:
        status = "Cash Deficit"
        status_color = "#c0392b"
        deficit = abs(net_cash_flow)
        explanation = (
            f"You are experiencing a cash deficit of {currency}{deficit:,} for this {period}. "
            f"You are spending more cash than you are receiving, which depletes your cash balance."
        )
    else:
        status = "Cash Neutral / Balanced"
        status_color = "#b87c1a"
        explanation = (
            f"Your cash inflow exactly matches your cash outflow. "
            f"Your cash balance remains unchanged at {currency}{closing_balance:,}."
        )

    # Working capital & runway analysis
    runway_months = None
    if total_outflow > 0 and closing_balance > 0:
        runway_months = round(closing_balance / total_outflow, 1)

    # Risk warnings
    risks = []
    if net_cash_flow < 0:
        risks.append({
            "severity": "High",
            "title": "Negative Cash Flow",
            "message": f"Monthly outflow exceeds inflow by {currency}{abs(net_cash_flow):,}.",
            "action": "Defer non-urgent capital expenditures and accelerate pending customer collections.",
        })
    if closing_balance < 10000 and currency != "$":
        risks.append({
            "severity": "Moderate" if closing_balance > 0 else "Critical",
            "title": "Low Cash Reserves",
            "message": f"Closing balance is {currency}{closing_balance:,}, below standard safety buffer.",
            "action": "Maintain minimum 1 month of operating expenses as emergency working capital.",
        })
    if receivables > 0 and (receivables >= income * 0.3):
        risks.append({
            "severity": "Moderate",
            "title": "Uncollected Receivables Exposure",
            "message": f"{currency}{int(receivables):,} tied up in pending customer payments creates short-term liquidity drag.",
            "action": "Enforce strict 15-day payment reminders or offer 2% discount for early settlements.",
        })
    if payables > 0 and (payables >= expenses * 0.25):
        risks.append({
            "severity": "Moderate",
            "title": "Upcoming Supplier Payables Due",
            "message": f"{currency}{int(payables):,} due to suppliers requires cash allocation before the next cycle.",
            "action": "Schedule supplier payments immediately following collection of customer receivables.",
        })
    if loan_out > 0 and (loan_out / (total_inflow or 1.0)) > 0.40:
        risks.append({
            "severity": "High",
            "title": "High Debt Servicing Ratio",
            "message": f"Loan repayments ({currency}{loan_out:,}) consume {round((loan_out/total_inflow)*100)}% of total cash inflow.",
            "action": "Explore loan restructuring or concessional agricultural credit refinancing.",
        })

    # Actionable recommendations
    recommendations = []
    if net_cash_flow < 0:
        recommendations.append("Cut discretionary farm and operational overhead expenses by at least 15%.")
    if receivables > 0:
        recommendations.append(f"Accelerate recovery of {currency}{int(receivables):,} in pending customer payments to boost liquid working capital.")
    if payables > 0:
        recommendations.append(f"Negotiate 30-day staggered credit terms on {currency}{int(payables):,} supplier bills to avoid sudden cash drain.")
    recommendations.append(f"Enforce monthly farm operating budget ({currency}{round(expenses*0.35):,} seeds/inputs, {currency}{round(expenses*0.28):,} labor, {currency}{round(expenses*0.12):,} power/irrigation).")
    recommendations.append("Anticipate seasonal agricultural lean periods (pre-monsoon/planting) by preserving at least 25% of net monthly cash surplus in a liquid reserve.")

    # Breakdown by category if not provided
    if not category_breakdown and expenses > 0:
        category_breakdown = {
            "Seeds & Fertilizers": round(expenses * 0.35),
            "Labor & Field Machinery": round(expenses * 0.28),
            "Irrigation & Electricity": round(expenses * 0.12),
            "Transportation & Logistics": round(expenses * 0.08),
            "Farm Overheads & Buffer": round(expenses * 0.17),
        }

    return {
        "available": True,
        "type": "cashflow_summary",
        "period": period,
        "currency": currency,
        "opening_balance": opening_balance,
        "income": income,
        "loan_in": loan_in,
        "total_inflow": total_inflow,
        "expenses": expenses,
        "loan_out": loan_out,
        "total_outflow": total_outflow,
        "operating_net": operating_net,
        "net_cash_flow": net_cash_flow,
        "closing_balance": closing_balance,
        "working_capital": working_capital,
        "receivables": receivables if receivables > 0 else None,
        "payables": payables if payables > 0 else None,
        "working_capital_cycle": working_capital_cycle,
        "status": status,
        "status_color": status_color,
        "explanation": explanation,
        "runway_months": runway_months,
        "category_breakdown": category_breakdown,
        "risks": risks,
        "recommendations": recommendations,
        "source": "BioAsset Financial Intelligence Engine & Agricultural Standards",
    }


def calculate_what_if_scenario(
    base_state: dict[str, Any],
    sales_change_pct: float = 0.0,
    expense_change_pct: float = 0.0,
    expense_change_amount: float = 0.0,
    new_loan_amount: float = 0.0,
    new_loan_emi: float = 0.0,
    scenario_title: str = "What-If Scenario",
) -> dict[str, Any]:
    """
    Run an isolated what-if simulation without modifying actual records.
    Calculates impact of sales drop/gain, cost inflation, or new debt.
    """
    orig_income = float(base_state.get("income", 80000))
    orig_expenses = float(base_state.get("expenses", 65000))
    orig_opening = float(base_state.get("opening_balance", 40000))
    orig_loan_in = float(base_state.get("loan_in", 0))
    orig_loan_out = float(base_state.get("loan_out", 0))

    # Apply adjustments
    new_income = round(orig_income * (1.0 + sales_change_pct / 100.0))
    new_expenses = orig_expenses
    if expense_change_pct != 0:
        new_expenses = round(new_expenses * (1.0 + expense_change_pct / 100.0))
    if expense_change_amount != 0:
        new_expenses = round(new_expenses + expense_change_amount)

    new_loan_in = orig_loan_in + new_loan_amount
    new_loan_out = orig_loan_out + new_loan_emi

    orig_summary = calculate_cashflow_summary(
        income=orig_income, expenses=orig_expenses, opening_balance=orig_opening,
        loan_in=orig_loan_in, loan_out=orig_loan_out, period=base_state.get("period", "monthly")
    )
    new_summary = calculate_cashflow_summary(
        income=new_income, expenses=new_expenses, opening_balance=orig_opening,
        loan_in=new_loan_in, loan_out=new_loan_out, period=base_state.get("period", "monthly")
    )

    diff_net = new_summary["net_cash_flow"] - orig_summary["net_cash_flow"]
    diff_closing = new_summary["closing_balance"] - orig_summary["closing_balance"]

    return {
        "available": True,
        "type": "what_if_scenario",
        "scenario_title": scenario_title,
        "baseline": {
            "income": orig_income,
            "expenses": orig_expenses,
            "net_cash_flow": orig_summary["net_cash_flow"],
            "closing_balance": orig_summary["closing_balance"],
            "status": orig_summary["status"],
        },
        "simulated": {
            "income": new_income,
            "expenses": new_expenses,
            "net_cash_flow": new_summary["net_cash_flow"],
            "closing_balance": new_summary["closing_balance"],
            "status": new_summary["status"],
        },
        "diff": {
            "net_cash_flow_diff": diff_net,
            "closing_balance_diff": diff_closing,
            "impact_summary": (
                f"Net cash flow changes by ₹{diff_net:+,} "
                f"(from ₹{orig_summary['net_cash_flow']:,} to ₹{new_summary['net_cash_flow']:,}). "
                f"Closing balance becomes ₹{new_summary['closing_balance']:,}."
            ),
        },
        "is_simulation": True,
        "note": "Hypothetical scenario for planning only. Actual financial records remain unchanged.",
    }


def calculate_cashflow_forecast(
    opening_balance: float = 40000.0,
    monthly_income: float = 80000.0,
    monthly_expenses: float = 65000.0,
    loan_emi: float = 0.0,
    months_ahead: int = 6,
    harvest_boost_month: int = 4,
    harvest_boost_amount: float = 50000.0,
) -> dict[str, Any]:
    """
    Build month-by-month cash flow forecast.
    """
    today = datetime.now()
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    forecast_rows = []
    current_balance = float(opening_balance)
    
    for i in range(months_ahead):
        month_idx = (today.month - 1 + i) % 12
        year = today.year + ((today.month - 1 + i) // 12)
        label = f"{month_names[month_idx]} {year}"
        
        # Monthly inflow
        inflow = float(monthly_income)
        if i == harvest_boost_month - 1:
            inflow += float(harvest_boost_amount)
            
        outflow = float(monthly_expenses) + float(loan_emi)
        net = inflow - outflow
        current_balance += net
        
        forecast_rows.append({
            "month_index": i + 1,
            "label": label,
            "inflow": round(inflow),
            "outflow": round(outflow),
            "net": round(net),
            "closing_balance": round(current_balance),
            "is_deficit": net < 0,
        })
        
    return {
        "available": True,
        "type": "cashflow_forecast",
        "months_ahead": months_ahead,
        "opening_balance": opening_balance,
        "final_projected_balance": current_balance,
        "rows": forecast_rows,
        "note": "Projected values based on current run-rate. Actual figures will depend on seasonal yields and market mandi rates.",
    }


def get_default_sample_cashflow() -> dict[str, Any]:
    """
    Standard farm baseline from R. Kumar (Thiruvallur, Paddy Kharif 2026).
    Opening: ₹40,000 | Crop Sales & Subsidies: ₹95,500 | Farm & Living Expenses: ₹59,700.
    """
    return calculate_cashflow_summary(
        income=95500,
        expenses=59700,
        opening_balance=40000,
        loan_in=25000,
        loan_out=4200,
        period="Kharif Season (Jun–Oct)",
        category_breakdown={
            "Seeds & Fertilizer": 17000,
            "Labour & Land Prep": 25200,
            "Borewell & Irrigation": 6500,
            "Transport & Mandi Bags": 3200,
            "Household Living Expenses": 7800,
        }
    )

