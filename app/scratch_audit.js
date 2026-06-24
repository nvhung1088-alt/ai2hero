const fs = require('fs');
const path = require('path');

const libDbPath = path.join(__dirname, 'lib', 'db');
const actionFiles = fs.readdirSync(libDbPath).filter(f => f.endsWith('-actions.ts'));

console.log(`Auditing ${actionFiles.length} action files...`);

let totalVulnerabilities = 0;

for (const file of actionFiles) {
  const filePath = path.join(libDbPath, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const funcRegex = /export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(/g;
  let match;
  let missingAuth = [];
  
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1];
    const startIndex = match.index;
    
    let braceCount = 0;
    let started = false;
    let endIndex = startIndex;
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        started = true;
      } else if (content[i] === '}') {
        braceCount--;
      }
      
      if (started && braceCount === 0) {
        endIndex = i;
        break;
      }
    }
    
    const funcBody = content.substring(startIndex, endIndex + 1);
    
    if (!funcBody.includes('await auth()') && 
        !funcBody.includes('auth()') && 
        !funcBody.includes('verifySignature') && 
        !funcBody.includes('checkAuth') &&
        !funcBody.includes('getUser(') &&
        !funcBody.includes('getTeamForUser(') &&
        !funcBody.includes('await requireUser(')) {
      missingAuth.push(funcName);
    }
  }
  
  if (missingAuth.length > 0) {
    console.log(`\n🚨 [${file}] - Missing Auth Check in ${missingAuth.length} functions:`);
    missingAuth.forEach(f => console.log(`  - ${f}`));
    totalVulnerabilities += missingAuth.length;
  }
}

console.log(`\nTotal potential missing auth vulnerabilities: ${totalVulnerabilities}`);
