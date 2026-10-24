/**
 * Shoppio admin: progressive product sync (one page per request).
 * Connection secrets are never handled in browser JS.
 */
(function () {
  'use strict';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function setStatus(el, text, isError) {
    if (!el) return;
    el.textContent = text || '';
    el.style.display = text ? 'block' : 'none';
    el.classList.toggle('notice-error', !!isError);
    el.classList.toggle('notice-success', !isError && !!text);
    el.classList.toggle('notice-info', !isError && !!text && text.indexOf('…') !== -1);
  }

  async function syncPage(page) {
    const res = await fetch(ShoppioAdmin.syncUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-WP-Nonce': ShoppioAdmin.restNonce,
      },
      body: JSON.stringify({ page: page }),
    });

    const payload = await res.json().catch(function () {
      return null;
    });

    if (!res.ok) {
      var msg =
        (payload && payload.message) ||
        (payload && payload.data && payload.data.message) ||
        ShoppioAdmin.i18n.failed;
      throw new Error(msg);
    }

    return payload;
  }

  async function runSync(button, statusEl) {
    button.disabled = true;
    setStatus(statusEl, ShoppioAdmin.i18n.starting, false);

    var page = 1;
    try {
      while (true) {
        var result = await syncPage(page);
        setStatus(statusEl, result.message || ShoppioAdmin.i18n.starting, false);

        if (result.done) {
          setStatus(statusEl, result.message, false);
          break;
        }

        page = result.nextPage || page + 1;
      }
    } catch (err) {
      setStatus(statusEl, (err && err.message) || ShoppioAdmin.i18n.failed, true);
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = qs('#shoppio-sync-products');
    var statusEl = qs('#shoppio-sync-status');
    if (!button || typeof ShoppioAdmin === 'undefined') {
      return;
    }

    button.addEventListener('click', function (event) {
      event.preventDefault();
      runSync(button, statusEl);
    });
  });
})();
