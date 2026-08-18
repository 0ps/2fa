export const SUPPORT_MATRIX: string[][] = [
  ["App", "TOTP", "SHA-1", "SHA-256", "SHA-512", "6 digits", "8 digits", "Custom period"],
  ["Google Authenticator", "Yes", "Yes", "Varies", "Varies", "Yes", "Varies", "Varies"],
  ["Microsoft Authenticator", "Yes", "Yes", "Limited", "Limited", "Yes", "Limited", "Limited"],
  ["Aegis / andOTP-style", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
  ["1Password / Bitwarden", "Yes", "Yes", "Often", "Sometimes", "Yes", "Often", "Often"],
  ["iOS Passwords / Keychain", "Yes", "Yes", "Limited", "Limited", "Yes", "Limited", "Limited"],
  ["FreeOTP", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
];
