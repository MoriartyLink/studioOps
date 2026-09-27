#!/usr/bin/env bash
set -euo pipefail

DB=studioops

create_table() {
  local id="$1" name="$2" columns="$3" indexes="${4:-}"
  if appwrite tablesdb get-table --database-id "$DB" --table-id "$id" >/dev/null 2>&1; then
    echo "Table $id already exists"
    return
  fi
  if [[ -n "$indexes" ]]; then
    appwrite tablesdb create-table --database-id "$DB" --table-id "$id" --name "$name" --enabled --row-security --columns "$columns" --indexes "$indexes" -j
  else
    appwrite tablesdb create-table --database-id "$DB" --table-id "$id" --name "$name" --enabled --row-security --columns "$columns" -j
  fi
}

create_table profiles profiles '[{"key":"email","type":"email","required":true},{"key":"full_name","type":"string","size":128,"required":true},{"key":"role","type":"enum","elements":["owner","member"],"required":true},{"key":"job_title","type":"string","size":128},{"key":"phone","type":"string","size":32},{"key":"kpay_phone","type":"string","size":32},{"key":"status","type":"enum","elements":["active","inactive"],"required":true,"default":"active"},{"key":"joined_date","type":"datetime"}]' '[{"key":"role_idx","type":"key","attributes":["role"]},{"key":"status_idx","type":"key","attributes":["status"]}]'
create_table projects projects '[{"key":"name","type":"string","size":180,"required":true},{"key":"description","type":"text"},{"key":"status","type":"enum","elements":["planning","active","review","completed","archived"],"required":true},{"key":"start_date","type":"datetime"},{"key":"deadline","type":"datetime"},{"key":"created_by","type":"string","size":36,"required":true}]' '[{"key":"status_idx","type":"key","attributes":["status"]}]'
create_table project_members project_members '[{"key":"project_id","type":"string","size":36,"required":true},{"key":"member_id","type":"string","size":36,"required":true}]' '[{"key":"project_idx","type":"key","attributes":["project_id"]},{"key":"member_idx","type":"key","attributes":["member_id"]}]'
create_table tasks tasks '[{"key":"project_id","type":"string","size":36,"required":true},{"key":"title","type":"string","size":180,"required":true},{"key":"description","type":"text"},{"key":"assigned_to","type":"string","size":36},{"key":"status","type":"enum","elements":["todo","in_progress","review","blocked","done"],"required":true,"default":"todo"},{"key":"priority","type":"enum","elements":["low","medium","high"],"required":true,"default":"medium"},{"key":"start_date","type":"datetime"},{"key":"due_date","type":"datetime"},{"key":"created_by","type":"string","size":36,"required":true}]' '[{"key":"project_idx","type":"key","attributes":["project_id"]},{"key":"assignee_idx","type":"key","attributes":["assigned_to"]},{"key":"status_idx","type":"key","attributes":["status"]}]'
create_table project_payments project_payments '[{"key":"project_id","type":"string","size":36,"required":true},{"key":"member_id","type":"string","size":36,"required":true},{"key":"base_amount","type":"bigint","required":true,"default":0},{"key":"bonus","type":"bigint","required":true,"default":0},{"key":"deduction","type":"bigint","required":true,"default":0},{"key":"final_amount","type":"bigint","required":true},{"key":"status","type":"enum","elements":["unpaid","partial","paid"],"required":true,"default":"unpaid"},{"key":"adjustment_note","type":"text"},{"key":"created_by","type":"string","size":36,"required":true}]' '[{"key":"project_idx","type":"key","attributes":["project_id"]},{"key":"member_idx","type":"key","attributes":["member_id"]}]'
create_table payment_transactions payment_transactions '[{"key":"project_payment_id","type":"string","size":36,"required":true},{"key":"amount","type":"bigint","required":true},{"key":"payment_method","type":"enum","elements":["KPay","Cash","Bank Transfer","Other"],"required":true},{"key":"payment_date","type":"datetime","required":true},{"key":"note","type":"text"},{"key":"recorded_by","type":"string","size":36,"required":true}]' '[{"key":"payment_idx","type":"key","attributes":["project_payment_id"]}]'
create_table payment_adjustments payment_adjustments '[{"key":"project_payment_id","type":"string","size":36,"required":true},{"key":"previous_base_amount","type":"bigint","required":true},{"key":"previous_bonus","type":"bigint","required":true},{"key":"previous_deduction","type":"bigint","required":true},{"key":"previous_final_amount","type":"bigint","required":true},{"key":"new_base_amount","type":"bigint","required":true},{"key":"new_bonus","type":"bigint","required":true},{"key":"new_deduction","type":"bigint","required":true},{"key":"new_final_amount","type":"bigint","required":true},{"key":"reason","type":"text","required":true},{"key":"changed_by","type":"string","size":36,"required":true}]' '[{"key":"payment_idx","type":"key","attributes":["project_payment_id"]}]'
create_table monthly_reports monthly_reports '[{"key":"year","type":"integer","required":true},{"key":"month","type":"integer","required":true},{"key":"blockers","type":"text"},{"key":"notes","type":"text"},{"key":"created_by","type":"string","size":36,"required":true}]' '[{"key":"period_idx","type":"key","attributes":["year","month"]}]'
