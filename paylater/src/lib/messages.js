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
