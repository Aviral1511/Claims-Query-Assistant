// backend/src/templates.js
export const templates = {
  claim_status:
    "Claim {{claim_number}} for {{patient_name}} is *{{status}}* (₹{{amount}}). Submitted on {{submitted_at}}. Policy: {{policy_number}}.",
  claim_denial:
    "Claim {{claim_number}} was denied ({{denial_code}}): {{denial_reason}}. Provider: {{metadata.provider}}. Notes: {{notes}}",
  multiple_matches:
    "I found {{count}} claims matching your query. Showing top {{top}} results.",
  no_matches: "No matching claims found. Try using a claim number (e.g., CLM-2025-1000) or policy number."
};
