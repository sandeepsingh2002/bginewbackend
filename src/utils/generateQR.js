const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const generateQR = async (id) => {
  const dir = path.join(process.cwd(), 'public', 'qr');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.png`);
  await QRCode.toFile(filePath, id);
  return `${process.env.BASE_URL || ''}/qr/${id}.png`;
};

module.exports = generateQR;
