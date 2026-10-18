export function recoveryRedirect(origin: string) {
  return `${origin}/reset-password`;
}

export function hasRecoveryLink(hash: string) {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}

export function passwordError(password: string, confirmation: string) {
  if (password.length < 6) return "Use at least 6 characters.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}