# SpendWise

## Overview

This repository contains the code, sample datasets, and documentation for the **SpendWise** project — an expense tracker designed to streamline employee expense management within organizations. The application supports expense addition through OCR receipt scanning, voice input, and manual entry. It also supports multi-currency expenses and provides visual dashboards for managers to monitor employee spending, gain actionable insights, and make informed decisions.

## Project Structure

- **Code:** Scripts and modules implementing expense tracking, OCR processing, voice input, authorization workflows, and dashboard visualizations.
- **Datasets:** Sample dummy industry-standard spending data used for testing and model training.
- **Dashboards:** Visualizations presenting employee spendings to managers for oversight and analysis.

## Methodology

- **Authorization Workflow:** Employees can add expenses only after manager approval.
- **Expense Addition:** Multiple input modes including OCR scanning of receipts, voice input, and manual entry.
- **Multi-Currency Support:** Records expenses in different currencies to accommodate global usage.
- **Expense Policies:** Managers have exclusive rights to set and edit expense policies that govern employee spending limits and rules.
- **Data Visualization:** Dashboards designed to provide managers with clear, actionable insights.
- **Overspending Detection (Experimental):** Attempted training of a model to detect overspending habits and flag suspicious expenses using the sample data; however, the model did not achieve satisfactory accuracy.

---
