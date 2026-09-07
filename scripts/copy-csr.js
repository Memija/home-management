const fs = require('fs');
const path = require('path');

const src = path.resolve(process.cwd(), 'dist/home-management/browser/index.csr.html');
const dest = path.resolve(process.cwd(), 'dist/home-management/browser/index.html');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('CSR fallback copied: index.csr.html -> index.html');
} else {
  console.warn(`Warning: CSR template not found at ${src}`);
}
