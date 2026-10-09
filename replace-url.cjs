const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace single-quoted URL
      content = content.replace(/'http:\/\/localhost:5000(.*?)'/g, '`${import.meta.env.VITE_API_URL}$1`');
      
      // Replace double-quoted URL
      content = content.replace(/"http:\/\/localhost:5000(.*?)"/g, '`${import.meta.env.VITE_API_URL}$1`');
      
      // Replace within template literals
      content = content.replace(/http:\/\/localhost:5000/g, '${import.meta.env.VITE_API_URL}');
      
      // Fix double substitution in template literals if any (e.g. ${${import...}})
      content = content.replace(/\$\{\$\{import\.meta\.env\.VITE_API_URL\}\}/g, '${import.meta.env.VITE_API_URL}');
      
      fs.writeFileSync(fullPath, content);
      console.log('Updated: ' + fullPath);
    }
  }
}

processDir(srcDir);
