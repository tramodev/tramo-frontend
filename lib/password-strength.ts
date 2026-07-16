export type PasswordStrength = {
  label: string
  filled: 1 | 2 | 3
  barColor: string
  textColor: string
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) {
    return { label: "Weak", filled: 1, barColor: "bg-destructive", textColor: "text-destructive" }
  }
  if (score <= 3) {
    return { label: "Medium", filled: 2, barColor: "bg-warning", textColor: "text-warning-foreground" }
  }
  return { label: "Strong", filled: 3, barColor: "bg-success", textColor: "text-success" }
}
