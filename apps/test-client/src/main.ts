const API_URL = 'http://localhost:8787/api';

const $ = (selector: string) => document.querySelector(selector) as HTMLElement;
const $input = (selector: string) => document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;

// Health Check
$('#btn-health')?.addEventListener('click', async () => {
  const resultDiv = $('#health-result');
  resultDiv.textContent = 'Checking...';
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    resultDiv.innerHTML = `<span class="success">OK: ${JSON.stringify(data)}</span>`;
  } catch (err) {
    resultDiv.innerHTML = `<span class="error">Error: ${err}</span>`;
  }
});

// Items
$('#btn-list-items')?.addEventListener('click', async () => {
  const pre = $('#items-result');
  pre.textContent = 'Loading...';
  try {
    const res = await fetch(`${API_URL}/items`);
    const data = await res.json();
    pre.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    pre.textContent = `Error: ${err}`;
  }
});

$('#btn-create-item')?.addEventListener('click', async () => {
  const url = $input('#item-url').value;
  const pre = $('#items-result');
  pre.textContent = 'Creating...';
  
  if (!url) {
    pre.textContent = 'Error: URL is required';
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    pre.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    pre.textContent = `Error: ${err}`;
  }
});

// Chat
$('#btn-send-chat')?.addEventListener('click', async () => {
  const message = $input('#chat-message').value;
  const pre = $('#chat-result');
  pre.textContent = 'Sending...';

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }) // Guessing schema
    });
    const data = await res.json();
    pre.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    pre.textContent = `Error: ${err}`;
  }
});

// SSE
let eventSource: EventSource | null = null;

$('#btn-connect-sse')?.addEventListener('click', () => {
  if (eventSource) return;
  
  const status = $('#sse-status');
  const log = $('#sse-log');
  
  status.textContent = 'Connecting...';
  status.className = 'status';
  
  eventSource = new EventSource(`${API_URL}/items/events`);
  
  eventSource.onopen = () => {
    status.textContent = 'Connected';
    status.className = 'status success';
    ($('#btn-disconnect-sse') as HTMLButtonElement).disabled = false;
    ($('#btn-connect-sse') as HTMLButtonElement).disabled = true;
    log.textContent += `[${new Date().toLocaleTimeString()}] Connected\n`;
  };
  
  eventSource.onmessage = (event) => {
    log.textContent += `[${new Date().toLocaleTimeString()}] Message: ${event.data}\n`;
    // Auto scroll
    log.scrollTop = log.scrollHeight;
  };
  
  eventSource.addEventListener('ping', (event) => {
      log.textContent += `[${new Date().toLocaleTimeString()}] Ping: ${event.data}\n`;
  })

  eventSource.onerror = (err) => {
    console.error('SSE Error:', err);
    status.textContent = 'Error (see console)';
    status.className = 'status error';
    log.textContent += `[${new Date().toLocaleTimeString()}] Error occurred\n`;
    // Often browser reconnects automatically, so we don't necessarily close it here
    // unless we want to stop.
  };
});

$('#btn-disconnect-sse')?.addEventListener('click', () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    
    const status = $('#sse-status');
    status.textContent = 'Disconnected';
    status.className = 'status';
    
    ($('#btn-disconnect-sse') as HTMLButtonElement).disabled = true;
    ($('#btn-connect-sse') as HTMLButtonElement).disabled = false;
    
    $('#sse-log').textContent += `[${new Date().toLocaleTimeString()}] Disconnected\n`;
  }
});
