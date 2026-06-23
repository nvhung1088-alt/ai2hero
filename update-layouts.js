const fs = require('fs');
const path = require('path');

const apps = [
  { id: 'connect-hub', dir: 'connect-hub' },
  { id: 'hero-care', dir: 'hero-care' },
  { id: 'hero-report', dir: 'hero-report' },
  { id: 'hero-social', dir: 'hero-social' },
  { id: 'herovideo', dir: 'herovideodownload' },
  { id: 'sim', dir: 'sim' }
];

for (const app of apps) {
  const filePath = path.join('app', 'app', '(dashboard)', app.dir, 't', '[teamId]', 'layout.tsx');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('isPreviewMode')) {
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
      
      content = content.slice(0, endOfLastImport) + 
        "import { isPreviewMode } from '@/lib/preview-actions';\nimport { PreviewBanner } from '@/app/(dashboard)/preview-banner';\n" + 
        content.slice(endOfLastImport);
    }
    
    const searchStr = `if (!activatedApps.includes('${app.id}')) {`;
    if (content.includes(searchStr)) {
      content = content.replace(searchStr, `const isPreview = await isPreviewMode('${app.id}', teamId);\n  if (!activatedApps.includes('${app.id}') && !isPreview) {`);
    }

    if (!content.includes('<PreviewBanner')) {
      // Find `return (` and inject fragment
      const returnMatch = content.match(/return\s*\(/);
      if (returnMatch) {
        const returnIndex = returnMatch.index;
        const replaceString = `return (\n    <>\n      {isPreview && <PreviewBanner appId="${app.id}" />}`;
        content = content.substring(0, returnIndex) + content.substring(returnIndex).replace(/return\s*\(/, replaceString);
        
        // Find last `);` and replace with `</>\n  );`
        const lastParenSemi = content.lastIndexOf(');');
        if (lastParenSemi > -1) {
            content = content.substring(0, lastParenSemi) + '\n    </>\n  );' + content.substring(lastParenSemi + 2);
        }
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + app.id);
  }
}
