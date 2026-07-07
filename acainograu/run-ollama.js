// Simple wrapper to call a local Ollama model (gemma4) and stream the response.
// Usage: node run-ollama.js [your prompt here]

import { spawn } from 'child_process';

const prompt = process.argv.slice(2).join(' ') || 'Crie um componente React que lista transações com estilo simples.';

const p = spawn('ollama', ['run', 'gemma4']);

p.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

p.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

p.on('close', (code) => {
  console.log(`\n[run-ollama] processo finalizou com código ${code}`);
});

// send prompt
p.stdin.write(prompt + '\n');
// close stdin to indicate end of message
p.stdin.end();
