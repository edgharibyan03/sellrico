(function () {
  "use strict";

  var cfg = window.shoppioChat || null;
  if (!cfg || !cfg.restUrl) return;

  var SESSION_KEY = "shoppio_chat_session";
  var CONVO_KEY = "shoppio_chat_conversation";
  var LANG_KEY = "shoppio_chat_lang";

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

  /**
   * Prefer browser language; fall back to WP site language.
   * ru / hy (Armenian) → Russian UI copy.
   */
  function detectLang() {
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

  var i18n = (cfg.i18n && cfg.i18n[lang]) || (cfg.i18n && cfg.i18n.en) || {};
  function t(key, fallback) {
    return i18n[key] || fallback || key;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var launcher = el("button", "shoppio-chat-launcher", "");
  launcher.type = "button";
  launcher.setAttribute("aria-label", t("title", "Chat"));
  launcher.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 4v-4.5A2.5 2.5 0 0 1 4 13.5v-7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  var panel = el("div", "shoppio-chat-panel");
  var header = el("div", "shoppio-chat-header");
  header.appendChild(el("strong", "", t("title", "Shoppio Assistant")));
  var closeBtn = el("button", "shoppio-chat-close", "×");
  closeBtn.type = "button";
  header.appendChild(closeBtn);

  var messages = el("div", "shoppio-chat-messages");
  var typing = el("div", "shoppio-chat-typing", "");
  typing.hidden = true;

  var form = el("form", "shoppio-chat-form");
  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = t("placeholder", "Ask about products…");
  input.autocomplete = "off";
  var sendBtn = el("button", "shoppio-chat-send", "");
  sendBtn.type = "submit";
  sendBtn.setAttribute("aria-label", t("sendLabel", "Send"));
  sendBtn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/></svg>';
  form.appendChild(input);
  form.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(typing);
  panel.appendChild(form);

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

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
    var bubble = el(
      "div",
      "shoppio-chat-bubble shoppio-chat-bubble--" + role
    );
    if (role === "assistant") {
      bubble.innerHTML = formatAssistantHtml(text);
    } else {
      bubble.textContent = text;
    }
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function addProducts(products) {
    if (!products || !products.length) return;
    var wrap = el("div", "shoppio-chat-products");
    wrap.appendChild(
      el("div", "shoppio-chat-products-title", t("productsLabel", "Products"))
    );
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

  addBubble(
    "assistant",
    t("welcomeMessage", "Hi! Looking for something specific? I can help you find products.")
  );

  function setOpen(open) {
    if (open) panel.classList.add("is-open");
    else panel.classList.remove("is-open");
  }

  launcher.addEventListener("click", function () {
    setOpen(!panel.classList.contains("is-open"));
    if (panel.classList.contains("is-open")) input.focus();
  });
  closeBtn.addEventListener("click", function () {
    setOpen(false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = (input.value || "").trim();
    if (!text || sendBtn.disabled) return;

    addBubble("user", text);
    input.value = "";
    sendBtn.disabled = true;
    typing.hidden = false;
    typing.textContent = t("thinkingLabel", "Thinking…");

    var payload = {
      message: text,
      sessionId: getSessionId(),
      locale: lang,
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
        addBubble("assistant", data.reply || "…");
        addProducts(data.products || []);
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
        input.focus();
      });
  });
})();
