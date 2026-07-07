import http from 'http';
import { spawn } from 'child_process';

const PORT = process.env.PORT || 3001;

function jsonResponse(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/api/ai') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const prompt = (data.prompt || '').toString().trim();
        if (!prompt) return jsonResponse(res, 400, { error: 'Missing prompt' });

        const p = spawn('ollama', ['run', 'gemma4']);

        let output = '';
        p.stdout.on('data', (d) => {
          output += d.toString();
        });
        p.stderr.on('data', (d) => {
          console.error('[ollama stderr]', d.toString());
        });

        p.on('close', (code) => {
          jsonResponse(res, 200, { output, code });
        });

        p.stdin.write(prompt + '\n');
        p.stdin.end();
      } catch (err) {
        console.error(err);
        jsonResponse(res, 500, { error: 'Invalid request body' });
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[run-ollama-server] Listening on http://localhost:${PORT} — POST /api/ai { "prompt": "..." }`);
});

export default server;