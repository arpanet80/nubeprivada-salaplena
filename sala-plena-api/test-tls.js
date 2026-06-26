// Prueba aislada de conexión + STARTTLS, sin nodemailer.
// Uso: node test-tls.js
const net = require('net');

const HOST = 'NALEXC002.oep.net';
const PORT = 587;

console.log(`Conectando a ${HOST}:${PORT}...`);

const socket = net.createConnection(PORT, HOST, () => {
  console.log('✅ Socket TCP conectado');
});

socket.setEncoding('utf8');

let step = 0;

socket.on('data', (data) => {
  console.log('<<<', data.trim());

  if (step === 0 && data.startsWith('220')) {
    console.log('>>> EHLO test');
    socket.write('EHLO test\r\n');
    step = 1;
  } else if (step === 1 && data.startsWith('250')) {
    // Puede venir en varias líneas; esperamos la línea final (250 sin guion)
    if (/^250 /m.test(data) || !data.includes('250-')) {
      console.log('>>> STARTTLS');
      socket.write('STARTTLS\r\n');
      step = 2;
    }
  } else if (step === 2 && data.startsWith('220')) {
    console.log('✅ Servidor aceptó STARTTLS, intentando upgrade a TLS...');
    const tls = require('tls');
    const tlsSocket = tls.connect(
      {
        socket,
        host: HOST,
        rejectUnauthorized: false,
        minVersion: 'TLSv1',
        maxVersion: 'TLSv1.3',
      },
      () => {
        console.log('✅✅ TLS ESTABLECIDO CORRECTAMENTE');
        console.log('Cipher:', tlsSocket.getCipher());
        process.exit(0);
      },
    );
    tlsSocket.on('error', (err) => {
      console.error('❌ Error en upgrade TLS:', err.message);
      console.error('   code:', err.code);
      console.error('   library:', err.library);
      console.error('   reason:', err.reason);
      process.exit(1);
    });
  }
});

socket.on('error', (err) => {
  console.error('❌ Error de socket:', err.message);
  process.exit(1);
});

socket.on('close', () => {
  console.log('🔌 Socket cerrado');
});

setTimeout(() => {
  console.error('⏱️ Timeout - no hubo respuesta en 15s');
  process.exit(1);
}, 15000);