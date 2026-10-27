const { networkInterfaces } = require('os');
const { spawn } = require('child_process');

const nets = networkInterfaces();
let realIp = '';

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Ignorar IPv6, localhost y la subred específica de VirtualBox/Hyper-V
    if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.') && !net.address.startsWith('192.168.56.')) {
      realIp = net.address;
      break;
    }
  }
  if (realIp) break;
}

if (!realIp) {
  console.error("❌ No se encontró una IP de Wi-Fi válida.");
  process.exit(1);
}

console.log(`\n🚀 Iniciando Expo forzado en la IP de Wi-Fi: ${realIp}\n`);

// Iniciar Expo pasándole la IP real en las variables de entorno
const expo = spawn('npx', ['expo', 'start', '-c'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: realIp }
});
