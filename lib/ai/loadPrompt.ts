import fs from 'fs';
import path from 'path';

export function loadPrompt(name: 'main-chat' | 'board-comment'): string {
  const filePath = path.join(process.cwd(), 'lib', 'ai', 'prompts', `${name}.md`);
  return fs.readFileSync(filePath, 'utf-8');
}
