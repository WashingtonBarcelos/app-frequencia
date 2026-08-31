// Brasil é UTC-3. Usar toISOString() aqui faz o culto de domingo
// virar sábado. Sempre en-CA, que devolve YYYY-MM-DD.
export function hojeLocal() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function normalizarData(valor) {
  if (!valor) return null;
  return String(valor).split('T')[0];
}
