const fs = require('fs');
const readline = require('readline');

const transcripts = [
  'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\48cc11e0-710d-41cc-a943-8585c0da0ba2\\.system_generated\\logs\\transcript.jsonl',
  'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\c959e3a3-c163-4f4f-ad88-2cb23345d193\\.system_generated\\logs\\transcript.jsonl',
  'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\85a8ffe2-284a-462d-ae8a-bd2fba968c57\\.system_generated\\logs\\transcript.jsonl'
];

async function extract() {
  let fileContent = '';
  for (const t of transcripts) {
    if (!fs.existsSync(t)) continue;
    const rl = readline.createInterface({ input: fs.createReadStream(t) });
    for await (const line of rl) {
      if (line.includes('connections-client.tsx') && line.includes('write_to_file')) {
        try {
          const obj = JSON.parse(line);
          for (const call of (obj.tool_calls || [])) {
             if (call.function.name === 'default_api:write_to_file') {
                 const args = JSON.parse(call.function.arguments);
                 if (args.TargetFile && args.TargetFile.includes('connections-client.tsx')) {
                     fileContent = args.CodeContent;
                     console.log('Found write_to_file with length:', fileContent.length);
                 }
             }
          }
        } catch(e) {}
      }
    }
  }
  if (fileContent) {
    const dir = 'C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/connect-hub/connections';
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dir + '/connections-client.tsx', fileContent);
    console.log('Restored base connections-client.tsx');
  } else {
    console.log('Not found in write_to_file');
  }
}
extract();
