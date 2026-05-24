export function generateMessage(customer) {
  const balance = Number(customer.remaining_balance).toLocaleString('en-IN')
  const name = customer.name

  if (customer.language_preference === 'malayalam') {
    return `ഹലോ ${name},

താങ്കളുടെ കുടിശ്ശിക തുക ₹${balance} ആണ്.

സൗകര്യമുള്ള സമയത്ത് പേയ്‌മെന്റ് നടത്തുക.

നന്ദി.`
  }

  return `Hello ${name},

Your pending balance amount is ₹${balance}.

Please complete the payment when possible.

Thank you.`
}

export function formatPhoneNumber(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  const last10 = cleaned.length >= 10 ? cleaned.substring(cleaned.length - 10) : cleaned
  if (last10.length === 10) {
    return `+91 ${last10.substring(0, 5)} ${last10.substring(5)}`
  }
  return phone
}
