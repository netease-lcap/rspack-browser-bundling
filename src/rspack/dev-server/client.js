

var port;
if (module.hot) {
  const log = function (level, msg) {
    if (typeof console === 'undefined') {
      return;
    }
    console[level]?.call(console, msg);
  };

  var lastHash;
  var upToDate = function upToDate() {
    return (lastHash).indexOf(__webpack_hash__) >= 0;
  };
  var check = function check() {
    module.hot
      .check(true)
      .then(function (updatedModules) {
        if (!updatedModules) {
          log(
            'warning',
            '[HMR] Cannot find update. ' +
              (typeof window !== 'undefined'
                ? 'Need to do a full reload!'
                : 'Please reload manually!'),
          );
          log(
            'warning',
            '[HMR] (Probably because of restarting the rspack-dev-server)',
          );
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
          return;
        }

        if (!upToDate()) {
          check();
        }

        if (upToDate()) {
          log('info', '[HMR] App is up to date.');
        }
      })
      .catch(function (err) {
        var status = module.hot.status();
        console.warn('[HMR] hot status: ' + status);
        console.error('[HMR] Update check failed:', err);
      });
  };

  function handleMessage(event) {
    console.log('[HMR] Received message from Main:', event.data);
    switch (event.data?.action) {
      case 'hmr-update': 
        var currentHash = event.data.hash;
        lastHash = currentHash;
        if (!upToDate() && module.hot.status() === 'idle') {
          log('info', '[HMR] Checking for updates on the server...');
          check();
        }
        break;

      default:
         break;
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'hmr-connect' && event.ports.length > 0) {
      if (port) {
        port.close()
      }

      port = event.ports[0]
      port.onmessage = handleMessage
      port.onmessageerror = () => {
        console.error('[HMR] MessagePort error')
        port = null
      }

      port.postMessage({
        type: 'hmr-connected',
      });
      console.log('[HMR] Connected via MessagePort')
    }
  })

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'hmr-ready' }, '*')
    console.log('[HMR] Sent hmr-ready to parent')
  }

  log('info', '[HMR] Waiting for update signal from WDS...');
} else {
  throw new Error('[HMR] Hot Module Replacement is disabled.');
}