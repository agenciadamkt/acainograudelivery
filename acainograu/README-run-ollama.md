# run-ollama-server

Lightweight HTTP wrapper to call local `gemma4` via `ollama run`.

Start:

```bash
npm run start-ollama-server
```

Example request:

```bash
curl -sS -X POST http://localhost:3001/api/ai \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Escreva um componente React que exiba uma lista de transações."}' | jq
```

Response:

```json
{
  "output": "<model output...>",
  "code": 0
}
```

Notes:

- Requires `ollama` installed and `gemma4` available locally.
- The server spawns `ollama run gemma4` per request — fine for low-volume development.

VS Code Tasks:

- `Start Ollama Gemma Server`: inicia o server local em `localhost:3001`.
- `Run Ollama Prompt`: executa `node run-ollama.js` com um prompt fornecido.

Abra a pasta `acainograu` no VS Code e use `Terminal > Run Task...` para executar.
