// Uso: node scripts/gerar-pin.js 1234
import bcrypt from 'bcryptjs';

const pin = process.argv[2];

if (!pin || !/^\d{4}$/.test(pin)) {
  console.error('Informe um PIN de exatamente 4 dígitos. Ex: node scripts/gerar-pin.js 1234');
  process.exit(1);
}

const hash = bcrypt.hashSync(pin, 10);

console.log('\nHash gerado:\n');
console.log(hash);
console.log('\nRode no Neon:\n');
console.log(`UPDATE configuracoes SET valor = '${hash}' WHERE chave = 'pin_hash';\n`);
