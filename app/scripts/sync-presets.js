const fs = require('fs');
const path = require('path');

const toonflowSkillsDir = 'C:\\Users\\ADMIN\\OneDrive\\Desktop\\Toonflow-app\\data\\skills';
const publicPresetsDir = path.join(__dirname, '../app/public/presets');
const outputJson = path.join(__dirname, '../lib/hero-video-maker/presets.json');

// Ensure directories exist
if (!fs.existsSync(publicPresetsDir)) {
  fs.mkdirSync(publicPresetsDir, { recursive: true });
}

const presets = {
  artSkills: [],
  storySkills: []
};

function processCategory(categoryDirName, targetArray) {
  const categoryPath = path.join(toonflowSkillsDir, categoryDirName);
  if (!fs.existsSync(categoryPath)) return;

  const folders = fs.readdirSync(categoryPath);
  for (const folder of folders) {
    const folderPath = path.join(categoryPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    // Read markdown
    let promptContent = '';
    const mdFiles = ['README.md', 'prefix.md'];
    for (const mdFile of mdFiles) {
      const mdPath = path.join(folderPath, mdFile);
      if (fs.existsSync(mdPath)) {
        promptContent = fs.readFileSync(mdPath, 'utf8');
        break;
      }
    }

    // Process image
    let imageUrl = null;
    const imagesDir = path.join(folderPath, 'images');
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir);
      if (imageFiles.length > 0) {
        const firstImage = imageFiles[0];
        const sourceImage = path.join(imagesDir, firstImage);
        const destFileName = `${categoryDirName}_${folder}_${firstImage}`;
        const destImage = path.join(publicPresetsDir, destFileName);
        
        fs.copyFileSync(sourceImage, destImage);
        imageUrl = `/presets/${destFileName}`;
      }
    }

    // Name translation (roughly from folder name, just replace underscores)
    const displayName = folder.replace(/_/g, ' ');

    targetArray.push({
      id: folder,
      name: displayName,
      imageUrl: imageUrl,
      prompt: promptContent
    });
  }
}

processCategory('art_skills', presets.artSkills);
processCategory('story_skills', presets.storySkills);

fs.writeFileSync(outputJson, JSON.stringify(presets, null, 2), 'utf8');
console.log(`Successfully synced ${presets.artSkills.length} art skills and ${presets.storySkills.length} story skills!`);
console.log(`Images copied to public/presets and JSON saved to presets.json`);
