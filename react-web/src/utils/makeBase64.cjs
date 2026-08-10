const fs = require('fs');
const imgPath = 'c:/Users/SFT/Desktop/bardahl/react-web/public/bardahl_logo.png';
const b64 = fs.readFileSync(imgPath).toString('base64');
const content = `export const BARDAHL_LOGO_BASE64 = "data:image/png;base64,${b64}";\n`;
fs.writeFileSync('c:/Users/SFT/Desktop/bardahl/react-web/src/utils/logoBase64.js', content);
console.log('Successfully generated logoBase64.js! Size:', b64.length);
