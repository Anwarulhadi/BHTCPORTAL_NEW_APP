
export function installRuntimeErrorOverlay() {
  if (typeof window === 'undefined') return;

  const showError = (title: string, message: string, stack?: string) => {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.backgroundColor = '#fff0f0';
    div.style.color = '#b91c1c';
    div.style.zIndex = '999999';
    div.style.padding = '20px';
    div.style.overflow = 'auto';
    div.style.fontFamily = 'monospace';
    div.style.whiteSpace = 'pre-wrap';
    div.style.borderTop = '4px solid #ef4444';
    
    div.innerHTML = `
      <h2 style="margin-top: 0; color: #991b1b;">${title}</h2>
      <div style="margin-bottom: 16px; font-weight: bold;">${message}</div>
      ${stack ? `<pre style="background: rgba(255,255,255,0.5); padding: 10px; border-radius: 4px; overflow-x: auto;">${stack}</pre>` : ''}
      <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; padding: 8px 16px; background: #991b1b; color: white; border: none; border-radius: 4px; font-weight: bold;">Close</button>
    `;
    
    document.body.appendChild(div);
  };

  window.addEventListener('error', (event) => {
    showError('Runtime Error', event.message, event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    showError('Unhandled Promise Rejection', event.reason?.message || String(event.reason), event.reason?.stack);
  });
}
