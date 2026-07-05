import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'src/data/storyData.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(rawData);

for (const key in data) {
    if (data.hasOwnProperty(key)) {
        const scene = data[key];
        if (scene.characterName && scene.dialogue) {
            scene.sequence = [
                {
                    speaker: scene.characterName,
                    text: scene.dialogue
                }
            ];
            delete scene.characterName;
            delete scene.dialogue;
        }
    }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Fixed storyData.json');
