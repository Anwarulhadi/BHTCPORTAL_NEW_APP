let overlayInitialized = false;

const createOverlay = () => {
  const el = document.createElement('div');
  el.id = 'runtime-error-overlay';
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.right = '0';
  el.style.background = 'rgba(185,28,28,0.95)';
  el.style.color = '#fff';
  el.style.padding = '16px';
  el.style.zIndex = '9999';
  el.style.fontFamily = 'monospace';
  el.style.fontSize = '14px';
  el.style.whiteSpace = 'pre-wrap';
  el.style.display = 'none';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Hide';
  closeBtn.style.marginLeft = '16px';
  closeBtn.style.background = '#fff';
  closeBtn.style.color = '#b91c1c';
  closeBtn.style.border = 'none';
  closeBtn.style.padding = '2px 8px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    el.style.display = 'none';
  };
  el.append('Runtime error detected. Screenshot this and share with devs. ', closeBtn);
  const details = document.createElement('div');
  details.id = 'runtime-error-details';
  details.style.marginTop = '8px';
  el.appendChild(details);
  document.body.appendChild(el);
  return { el, details };
};

const showError = (message: string) => {
  const { el, details } = overlayInitialized
    ? { el: document.getElementById('runtime-error-overlay')!, details: document.getElementById('runtime-error-details')! }
    : createOverlay();
  overlayInitialized = true;
  if (details) {
    details.textContent = message;
  }
  el.style.display = 'block';
  console.error('[RuntimeErrorOverlay]', message);
};

const formatError = (error: any) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ''}`;
  }
  return JSON.stringify(error, null, 2);
};

export const installRuntimeErrorOverlay = () => {
  if (typeof window === 'undefined') return;
  if ((window as any).__runtimeErrorOverlayInstalled) return;
  (window as any).__runtimeErrorOverlayInstalled = true;

  window.addEventListener('error', (event) => {
    showError(formatError(event.error || event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    showError(formatError(event.reason));
  });
};
