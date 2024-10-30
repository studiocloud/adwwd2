export interface ValidationResult {
  email: string;
  validation_result: 'Valid' | 'Invalid';
  validation_reason: string;
  mx_check: boolean;
  dns_check: boolean;
  spf_check: boolean;
  mailbox_check: boolean;
  smtp_check: boolean;
  [key: string]: any; // Allow for additional fields from CSV
}