# key2agent

Paste an LLM API key into a notebook cell, get a code agent that works in your kernel.

```python
from IPython.display import HTML
HTML(url="https://raw.githubusercontent.com/<user>/<repo>/main/agent.html")
```

Run that cell. An empty `[ ]:` cell appears in the output:

1. Paste an API key, press Enter. The provider is picked from the key prefix
   (Anthropic, OpenAI, Gemini, OpenRouter, Groq).
2. Type what you want. The agent writes Python, runs it in your notebook kernel,
   reads the output, and keeps going until the task is done. It sees your existing
   variables, and what it creates stays available to your own cells.

Enter sends, Shift+Enter adds a line, Esc (or clicking `[*]:`) stops.

| Command | Effect |
|---|---|
| `/model <id>` | switch model |
| `/base <url>` | use any OpenAI-compatible endpoint |
| `/key` | enter a different key |
| `/clear` | forget the conversation (kernel state is untouched) |
| `/remember`, `/forget` | keep / remove the key in this browser's localStorage |
| `/help` | show provider, model and which Python backend is in use |

## How it works

`agent.html` is one self-contained file: no build step, no Python package.

- **LLM calls** go straight from your browser to the provider. The key lives in
  the page's memory only (unless you `/remember` it) and is never written into
  the notebook file.
- **Code execution** uses the Jupyter server the notebook page is served from:
  it finds the kernel that rendered the cell and talks to it over the standard
  kernel websocket.
- If the page exposes no Jupyter server (for example the output is rendered in a
  sandboxed iframe), it falls back to **Pyodide**, a Python that runs in the
  browser. That one cannot see your notebook's variables or files; `/help`
  tells you which backend you got.

The agent runs code without asking for confirmation, with the same access your
own cells have.
