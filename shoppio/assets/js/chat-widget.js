(function () {
  "use strict";

  var cfg = window.shoppioChat || null;
  if (!cfg || !cfg.restUrl) return;

  var SESSION_KEY = "shoppio_chat_session";
  var CONVO_KEY = "shoppio_chat_conversation";
  var LANG_KEY = "shoppio_chat_lang";
  var PANEL_POS_KEY = "shoppio_chat_panel_pos";
  var LAUNCHER_POS_KEY = "shoppio_chat_launcher_pos";

  try {
    localStorage.removeItem(PANEL_POS_KEY);
    localStorage.removeItem(LAUNCHER_POS_KEY);
  } catch (e) {
    /* ignore */
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getSessionId() {
    try {
      var existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var created = uid();
      localStorage.setItem(SESSION_KEY, created);
      return created;
    } catch (e) {
      return uid();
    }
  }

  function getConversationId() {
    try {
      return localStorage.getItem(CONVO_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setConversationId(id) {
    try {
      if (id) localStorage.setItem(CONVO_KEY, id);
    } catch (e) {
      /* ignore */
    }
  }

  var assistant = cfg.assistant || {};

  function clampOffset(value, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    if (n < 0) return 0;
    if (n > 200) return 200;
    return Math.round(n);
  }

  function normalizeHex(color) {
    var raw = String(color || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
    return "#0F766E";
  }

  function hoverColor(hex) {
    var value = normalizeHex(hex).slice(1);
    var r = parseInt(value.slice(0, 2), 16);
    var g = parseInt(value.slice(2, 4), 16);
    var b = parseInt(value.slice(4, 6), 16);
    r = Math.min(255, Math.round(r + (255 - r) * 0.18));
    g = Math.min(255, Math.round(g + (255 - g) * 0.18));
    b = Math.min(255, Math.round(b + (255 - b) * 0.18));
    return (
      "#" +
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0")
    ).toUpperCase();
  }

  var host = document.createElement("div");
  host.className = "shoppio-chat-host";

  function applyTheme() {
    var accent = normalizeHex(assistant.primaryColor);
    var right = clampOffset(assistant.offsetRight, 20);
    var bottom = clampOffset(assistant.offsetBottom, 20);
    host.style.setProperty("--shoppio-accent", accent);
    host.style.setProperty("--shoppio-accent-hover", hoverColor(accent));
    if(right) {
      host.style.setProperty("--shoppio-offset-right", right + "px");  
    }
    if(bottom) {
      host.style.setProperty("--shoppio-offset-bottom", bottom + "px");
    }
    host.style.setProperty("--shoppio-icon", "#ffffff");
  }

  applyTheme();

  function detectLang() {
    var configured = String(assistant.language || "")
      .toLowerCase()
      .split(/[-_]/)[0];
    if (configured === "ru" || configured === "hy") return "ru";
    if (configured === "en") return "en";

    try {
      var stored = localStorage.getItem(LANG_KEY);
      if (stored === "ru" || stored === "en") return stored;
    } catch (e) {
      /* ignore */
    }

    var candidates = [];
    if (navigator.languages && navigator.languages.length) {
      for (var i = 0; i < navigator.languages.length; i++) {
        candidates.push(navigator.languages[i]);
      }
    }
    if (navigator.language) candidates.push(navigator.language);
    if (navigator.userLanguage) candidates.push(navigator.userLanguage);
    if (document.documentElement && document.documentElement.lang) {
      candidates.push(document.documentElement.lang);
    }
    if (cfg.siteLang) candidates.push(cfg.siteLang);

    for (var j = 0; j < candidates.length; j++) {
      var code = String(candidates[j] || "")
        .toLowerCase()
        .replace("_", "-");
      if (code.indexOf("ru") === 0 || code.indexOf("hy") === 0) {
        return "ru";
      }
      if (code.indexOf("en") === 0) {
        return "en";
      }
    }

    return cfg.siteLang === "ru" ? "ru" : "en";
  }

  var lang = detectLang();
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    /* ignore */
  }

  var apiLocale =
    String(assistant.language || "").trim() ||
    (lang === "ru" ? "ru" : lang);

  var i18n = (cfg.i18n && cfg.i18n[lang]) || (cfg.i18n && cfg.i18n.en) || {};
  function t(key, fallback) {
    return i18n[key] || fallback || key;
  }

  var titleText =
    (assistant.name && String(assistant.name).trim()) ||
    t("title", "Shoppio Assistant");
  var welcomeText =
    (assistant.welcomeMessage && String(assistant.welcomeMessage).trim()) ||
    t(
      "welcomeMessage",
      "Hi! Looking for something specific? I can help you find products."
    );

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var launcher = el("button", "shoppio-chat-launcher", "");
  launcher.type = "button";
  launcher.setAttribute("aria-label", titleText);
  launcher.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M352 64C352 46.3 337.7 32 320 32C302.3 32 288 46.3 288 64L288 128L192 128C139 128 96 171 96 224L96 448C96 501 139 544 192 544L448 544C501 544 544 501 544 448L544 224C544 171 501 128 448 128L352 128L352 64zM160 432C160 418.7 170.7 408 184 408L216 408C229.3 408 240 418.7 240 432C240 445.3 229.3 456 216 456L184 456C170.7 456 160 445.3 160 432zM280 432C280 418.7 290.7 408 304 408L336 408C349.3 408 360 418.7 360 432C360 445.3 349.3 456 336 456L304 456C290.7 456 280 445.3 280 432zM400 432C400 418.7 410.7 408 424 408L456 408C469.3 408 480 418.7 480 432C480 445.3 469.3 456 456 456L424 456C410.7 456 400 445.3 400 432zM224 240C250.5 240 272 261.5 272 288C272 314.5 250.5 336 224 336C197.5 336 176 314.5 176 288C176 261.5 197.5 240 224 240zM368 288C368 261.5 389.5 240 416 240C442.5 240 464 261.5 464 288C464 314.5 442.5 336 416 336C389.5 336 368 314.5 368 288zM64 288C64 270.3 49.7 256 32 256C14.3 256 0 270.3 0 288L0 384C0 401.7 14.3 416 32 416C49.7 416 64 401.7 64 384L64 288zM608 256C590.3 256 576 270.3 576 288L576 384C576 401.7 590.3 416 608 416C625.7 416 640 401.7 640 384L640 288C640 270.3 625.7 256 608 256z"/></svg>';

  var panel = el("div", "shoppio-chat-panel");
  var header = el("div", "shoppio-chat-header");
  header.appendChild(el("strong", "", titleText));
  var closeBtn = el("button", "shoppio-chat-close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  header.appendChild(closeBtn);

  var messages = el("div", "shoppio-chat-messages");
  var typing = el("div", "shoppio-chat-typing", "");
  typing.hidden = true;

  var form = el("form", "shoppio-chat-form");
  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = t("placeholder", "Ask about products…");
  input.autocomplete = "off";
  input.setAttribute("enterkeyhint", "send");
  var sendBtn = el("button", "shoppio-chat-send", "");
  sendBtn.type = "submit";
  sendBtn.setAttribute("aria-label", t("sendLabel", "Send"));
  sendBtn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12h16" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  form.appendChild(input);
  form.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(typing);
  panel.appendChild(form);
  var hideBranding =
    cfg.showBranding === false ||
    cfg.showBranding === 0 ||
    cfg.showBranding === "0" ||
    cfg.showBranding === "" ||
    cfg.showBranding === "false";
  if (!hideBranding) {
    panel.appendChild(el("div", "shoppio-chat-branding", "Powered by Shoppio"));
  }

  var backdrop = el("div", "shoppio-chat-backdrop");
  host.appendChild(backdrop);
  host.appendChild(panel);
  host.appendChild(launcher);
  document.body.appendChild(host);

  function isCompact() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function clearInlinePos(node) {
    node.style.left = "";
    node.style.top = "";
    node.style.right = "";
    node.style.bottom = "";
  }

  function pinBox(node, top, height) {
    node.style.setProperty("position", "fixed", "important");
    node.style.setProperty("left", "0", "important");
    node.style.setProperty("right", "0", "important");
    node.style.setProperty("width", "100%", "important");
    node.style.setProperty("bottom", "auto", "important");
    node.style.setProperty("max-height", "none", "important");
    node.style.setProperty("top", Math.max(0, top) + "px", "important");
    node.style.setProperty("height", Math.max(0, height) + "px", "important");
  }

  function clearPin(node) {
    ["position", "top", "left", "right", "bottom", "width", "height", "max-height"].forEach(
      function (prop) {
        node.style.removeProperty(prop);
      }
    );
  }

  var pageLock = null;

  function lockPage() {
    if (pageLock) return;
    var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    pageLock = { scrollY: scrollY };
    document.documentElement.classList.add("shoppio-chat-open");
    document.body.style.position = "fixed";
    document.body.style.top = "-" + scrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }

  function unlockPage() {
    if (!pageLock) {
      document.documentElement.classList.remove("shoppio-chat-open");
      return;
    }
    var scrollY = pageLock.scrollY;
    pageLock = null;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    document.documentElement.classList.remove("shoppio-chat-open");
    window.scrollTo(0, scrollY);
  }

  function syncViewport() {
    if (!isCompact() || !panel.classList.contains("is-open")) {
      host.style.removeProperty("--shoppio-vv-top");
      host.style.removeProperty("--shoppio-vv-height");
      panel.classList.remove("is-keyboard");
      clearPin(panel);
      clearPin(backdrop);
      return;
    }

    var vv = window.visualViewport;
    var offsetTop = vv ? vv.offsetTop : 0;
    var vvHeight = vv ? vv.height : window.innerHeight;
    var keyboard = !!(vv && window.innerHeight - vvHeight > 80);
    var top = keyboard ? offsetTop : 0;
    var height = keyboard
      ? vvHeight
      : Math.max(vvHeight + offsetTop, window.innerHeight);

    pinBox(backdrop, 0, Math.max(height + top, window.innerHeight));
    pinBox(panel, top, height);
    host.style.setProperty("--shoppio-vv-top", top + "px");
    host.style.setProperty("--shoppio-vv-height", height + "px");

    var wasKeyboard = panel.classList.contains("is-keyboard");
    panel.classList.toggle("is-keyboard", keyboard);
    if (keyboard && !wasKeyboard) {
      messages.scrollTop = messages.scrollHeight;
    }

    window.requestAnimationFrame(function () {
      if (!panel.classList.contains("is-open") || !isCompact()) return;
      var rect = panel.getBoundingClientRect();
      var targetBottom = keyboard && vv ? vv.height : window.innerHeight;
      var shortfall = targetBottom - rect.bottom;
      var lift = rect.top;
      if (shortfall > 1 || lift > 1) {
        pinBox(panel, top - Math.max(0, lift), height + Math.max(0, shortfall) + Math.max(0, lift));
        pinBox(
          backdrop,
          0,
          Math.max(window.innerHeight, targetBottom, height + Math.max(0, shortfall))
        );
      }
    });
  }

  function clampPos(left, top, width, height) {
    var maxLeft = Math.max(8, window.innerWidth - width - 8);
    var maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(maxLeft, Math.max(8, left)),
      top: Math.min(maxTop, Math.max(8, top)),
    };
  }

  function applyAbsolutePos(node, pos) {
    if (!pos) return;
    node.style.left = pos.left + "px";
    node.style.top = pos.top + "px";
    node.style.right = "auto";
    node.style.bottom = "auto";
  }

  function enableDrag(node, handle, options) {
    options = options || {};
    var onClick = options.onClick || null;
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var originLeft = 0;
    var originTop = 0;
    var pointerId = null;

    function currentPos() {
      var rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }

    function onPointerDown(e) {
      if (isCompact() && !options.allowCompact) return;
      if (e.button != null && e.button !== 0) return;
      if (options.ignoreSelector && e.target.closest(options.ignoreSelector)) {
        return;
      }
      var rect = node.getBoundingClientRect();
      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      originLeft = rect.left;
      originTop = rect.top;
      node.classList.add("is-dragging");
      handle.classList.add("is-dragging");
      try {
        handle.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      moved = true;
      var rect = node.getBoundingClientRect();
      var next = clampPos(
        originLeft + dx,
        originTop + dy,
        rect.width,
        rect.height
      );
      applyAbsolutePos(node, next);
    }

    function onPointerUp(e) {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return;
      dragging = false;
      node.classList.remove("is-dragging");
      handle.classList.remove("is-dragging");
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      if (moved) {
        if (typeof options.onMoved === "function") options.onMoved(currentPos());
      } else if (typeof onClick === "function") {
        onClick(e);
      }
      pointerId = null;
    }

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
  }

  function placePanelNearLauncher() {
    if (isCompact()) {
      clearInlinePos(panel);
      return;
    }
    var rect = launcher.getBoundingClientRect();
    var panelWidth = Math.min(380, window.innerWidth - 24);
    var panelHeight = Math.min(560, window.innerHeight - 120);
    var left = rect.right - panelWidth;
    var top = rect.top - panelHeight - 12;
    applyAbsolutePos(panel, clampPos(left, top, panelWidth, panelHeight));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatAssistantHtml(raw) {
    var text = String(raw || "");
    var openLabel = t("openProductLabel", "Open product");

    text = text.replace(
      /(^|\n)([^\n]+)\nLink:\s*(https?:\/\/\S+)/gi,
      function (_m, lead, name, url) {
        return lead + name.trim() + "\n[" + openLabel + "](" + url + ")";
      }
    );

    var html = escapeHtml(text);

    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a class="shoppio-chat-inline-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    html = html.replace(
      /(^|[^"'>])(https?:\/\/[^\s<]+)/g,
      function (_m, prefix, url) {
        var clean = url.replace(/[.,;:!?)\]}]+$/, "");
        var trailing = url.slice(clean.length);
        return (
          prefix +
          '<a class="shoppio-chat-inline-link" href="' +
          clean +
          '" target="_blank" rel="noopener noreferrer">' +
          openLabel +
          "</a>" +
          trailing
        );
      }
    );

    html = html.replace(
      /(^|\n)[-•]\s+/g,
      '$1<span class="shoppio-chat-bullet">•</span> '
    );

    return html.replace(/\n/g, "<br>");
  }

  function addBubble(role, text) {
    var cleaned = String(text || "").trim();
    if (!cleaned) return null;
    var bubble = el(
      "div",
      "shoppio-chat-bubble shoppio-chat-bubble--" + role
    );
    if (role === "assistant") {
      bubble.innerHTML = formatAssistantHtml(cleaned);
    } else {
      bubble.textContent = cleaned;
    }
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function stripProductMentions(text, products) {
    var lines = String(text || "")
      .split(/\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    var names = (products || [])
      .map(function (p) {
        return String(p.name || "")
          .toLowerCase()
          .trim();
      })
      .filter(Boolean);

    return lines
      .filter(function (line) {
        var lower = line.toLowerCase();
        // Drop explicit product/price list lines and UI meta.
        if (
          /[—\-–]\s*\d[\d\s]*\s*(₽|руб|rub|amd|драм|\$|€)/i.test(line) ||
          /^\d[\d\s]*\s*(₽|руб|rub|amd|драм)/i.test(line) ||
          /фото и цены|в карточках ниже|карточки товаров/i.test(line)
        ) {
          return false;
        }
        for (var i = 0; i < names.length; i++) {
          var name = names[i];
          if (!name) continue;
          if (lower.indexOf(name) !== -1) return false;
          // Match on distinctive model chunks (e.g. "uniline 30034").
          var chunks = name
            .split(/[^a-z0-9а-яё]+/i)
            .filter(function (c) {
              return c.length >= 4;
            });
          var hits = 0;
          for (var j = 0; j < chunks.length; j++) {
            if (lower.indexOf(chunks[j]) !== -1) hits += 1;
          }
          if (chunks.length >= 2 && hits >= 2) return false;
        }
        return true;
      })
      .join("\n")
      .trim();
  }

  function splitReplyAroundProducts(reply, products) {
    var cleaned = stripProductMentions(reply, products);
    if (!cleaned) {
      return { before: "", after: "" };
    }

    var blocks = cleaned
      .split(/\n\s*\n/)
      .map(function (block) {
        return block.trim();
      })
      .filter(Boolean);

    if (blocks.length >= 2) {
      return {
        before: blocks[0],
        after: blocks.slice(1).join("\n\n"),
      };
    }

    var lines = cleaned
      .split(/\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    if (lines.length >= 2) {
      var last = lines[lines.length - 1];
      if (/[?？]|скажите|уточн|подбер|если нуж/i.test(last)) {
        return {
          before: lines.slice(0, -1).join("\n"),
          after: last,
        };
      }
    }

    return { before: cleaned, after: "" };
  }

  function addProducts(products) {
    if (!products || !products.length) return;
    var wrap = el("div", "shoppio-chat-products");
    products.slice(0, 8).forEach(function (p) {
      var card = document.createElement(p.url ? "a" : "div");
      card.className = "shoppio-chat-product";
      if (p.url) {
        card.href = p.url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
      }

      var media = el("div", "shoppio-chat-product-media");
      if (p.imageUrl) {
        var img = document.createElement("img");
        img.src = p.imageUrl;
        img.alt = p.name || "";
        img.loading = "lazy";
        media.appendChild(img);
      } else {
        media.appendChild(el("div", "shoppio-chat-product-placeholder", ""));
      }
      card.appendChild(media);

      var meta = el("div", "shoppio-chat-product-meta");
      meta.appendChild(el("span", "", p.name || "Product"));
      if (p.price != null) {
        meta.appendChild(
          el(
            "small",
            "",
            (p.currency || "") + " " + Number(p.price).toFixed(0)
          )
        );
      }
      if (p.stockStatus) {
        var stockLabel =
          p.stockStatus === "instock" || p.stockStatus === "in_stock"
            ? t("inStockLabel", "In stock")
            : t("outOfStockLabel", "Out of stock");
        meta.appendChild(el("em", "shoppio-chat-product-stock", stockLabel));
      }
      card.appendChild(meta);
      wrap.appendChild(card);
    });
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  addBubble("assistant", welcomeText);

  var suggestionsWrap = null;
  var suggested = Array.isArray(assistant.suggestedQuestions)
    ? assistant.suggestedQuestions.filter(function (q) {
        return typeof q === "string" && q.trim();
      })
    : [];

  function clearSuggestions() {
    if (suggestionsWrap && suggestionsWrap.parentNode) {
      suggestionsWrap.parentNode.removeChild(suggestionsWrap);
    }
    suggestionsWrap = null;
  }

  function sendMessage(text) {
    text = String(text || "").trim();
    if (!text || sendBtn.disabled) return;

    clearSuggestions();
    addBubble("user", text);
    input.value = "";
    sendBtn.disabled = true;
    typing.hidden = false;
    typing.textContent = t("thinkingLabel", "Thinking…");

    var payload = {
      message: text,
      sessionId: getSessionId(),
      locale: apiLocale,
    };
    var conversationId = getConversationId();
    if (conversationId) payload.conversationId = conversationId;

    fetch(cfg.restUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": cfg.nonce || "",
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var msg =
            (result.body && result.body.message) ||
            t("genericError", "Sorry, I could not answer right now.");
          addBubble("assistant", msg);
          return;
        }
        var data = result.body;
        if (data.conversationId) setConversationId(data.conversationId);
        var products = data.products || [];
        if (products.length) {
          var parts = splitReplyAroundProducts(data.reply || "", products);
          addBubble("assistant", parts.before || "…");
          addProducts(products);
          if (parts.after) addBubble("assistant", parts.after);
        } else {
          addBubble("assistant", data.reply || "…");
        }
      })
      .catch(function () {
        addBubble(
          "assistant",
          t("networkError", "Network error. Please try again in a moment.")
        );
      })
      .finally(function () {
        sendBtn.disabled = false;
        typing.hidden = true;
        if (!isCompact()) input.focus();
      });
  }

  if (suggested.length) {
    suggestionsWrap = el("div", "shoppio-chat-suggestions");
    suggested.slice(0, 6).forEach(function (question) {
      var chip = el("button", "shoppio-chat-suggestion", question.trim());
      chip.type = "button";
      chip.addEventListener("click", function () {
        sendMessage(question);
      });
      suggestionsWrap.appendChild(chip);
    });
    panel.insertBefore(suggestionsWrap, form);
  }

  function setOpen(open) {
    if (open) {
      if (isCompact()) {
        clearInlinePos(panel);
      } else {
        placePanelNearLauncher();
      }
      panel.classList.add("is-open");
      host.classList.add("is-open");
      if (isCompact()) {
        lockPage();
        syncViewport();
      } else {
        input.focus();
      }
    } else {
      panel.classList.remove("is-open");
      panel.classList.remove("is-keyboard");
      host.classList.remove("is-open");
      host.style.removeProperty("--shoppio-vv-top");
      host.style.removeProperty("--shoppio-vv-height");
      clearPin(panel);
      clearPin(backdrop);
      unlockPage();
      input.blur();
    }
  }

  var skipLauncherClick = false;

  enableDrag(launcher, launcher, {
    allowCompact: true,
    onClick: function () {
      skipLauncherClick = true;
      window.setTimeout(function () {
        skipLauncherClick = false;
      }, 400);
      setOpen(!panel.classList.contains("is-open"));
    },
  });

  launcher.addEventListener("click", function (e) {
    if (skipLauncherClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!isCompact()) return;
    setOpen(!panel.classList.contains("is-open"));
  });

  enableDrag(panel, header, {
    ignoreSelector: ".shoppio-chat-close",
  });

  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sendMessage(input.value);
  });

  function onViewportChange() {
    if (isCompact()) {
      if (launcher.style.left || launcher.style.top) {
        var launcherRect = launcher.getBoundingClientRect();
        applyAbsolutePos(
          launcher,
          clampPos(
            launcherRect.left,
            launcherRect.top,
            launcherRect.width,
            launcherRect.height
          )
        );
      }
      syncViewport();
      return;
    }
    [launcher, panel].forEach(function (node) {
      var rect = node.getBoundingClientRect();
      if (node.style.left || node.style.top) {
        applyAbsolutePos(
          node,
          clampPos(rect.left, rect.top, rect.width, rect.height)
        );
      }
    });
  }

  window.addEventListener("resize", onViewportChange);
  window.addEventListener("orientationchange", onViewportChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onViewportChange);
    window.visualViewport.addEventListener("scroll", onViewportChange);
  }

  input.addEventListener("focus", function () {
    if (!isCompact()) return;
    window.setTimeout(syncViewport, 50);
    window.setTimeout(syncViewport, 300);
  });

  document.addEventListener(
    "touchmove",
    function (e) {
      if (!isCompact() || !host.classList.contains("is-open")) return;
      var target = e.target;
      if (
        target &&
        messages.contains(target) &&
        messages.scrollHeight > messages.clientHeight + 1
      ) {
        return;
      }
      e.preventDefault();
    },
    { passive: false }
  );
})();
