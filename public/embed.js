/**
 * Snipper embeddable widget.
 *
 * Drop this snippet anywhere a blogger or partner site can place a <script>:
 *
 *   <script async src="https://snipper-alpha.vercel.app/embed.js"
 *           data-snipper-height="720"></script>
 *
 * The script finds its own <script> tag and replaces it with an iframe
 * pointing to the audit flow on snipper-alpha.vercel.app. The iframe is
 * responsive width × fixed height (default 720px, configurable via
 * data-snipper-height).
 *
 * Deterministic & sandboxed:
 *   - No globals leaked beyond a single guard flag.
 *   - The iframe carries `?embed=1` so future embed-only styling can hook in.
 *   - `loading="lazy"` so the widget doesn't block the host page's paint.
 *   - `referrerpolicy="origin"` so we get attribution without leaking the
 *     full referrer URL of the host site.
 */
(function () {
  if (window.__snipperEmbedLoaded) return;
  window.__snipperEmbedLoaded = true;

  var scripts = document.getElementsByTagName("script");
  var self = null;
  for (var i = scripts.length - 1; i >= 0; i--) {
    var src = scripts[i].getAttribute("src") || "";
    if (src.indexOf("embed.js") !== -1) {
      self = scripts[i];
      break;
    }
  }
  if (!self) return;

  var origin = new URL(self.src, window.location.href).origin;
  var height = self.getAttribute("data-snipper-height") || "720";
  var theme = self.getAttribute("data-snipper-theme") || "auto";

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/audit?embed=1&theme=" + encodeURIComponent(theme);
  iframe.title = "Snipper · AI spend audit";
  iframe.loading = "lazy";
  iframe.referrerPolicy = "origin";
  iframe.setAttribute("frameborder", "0");
  iframe.style.cssText =
    "width:100%;max-width:760px;height:" +
    parseInt(height, 10) +
    "px;border:0;display:block;margin:0 auto;border-radius:16px;background:transparent;";

  // Replace the <script> tag with the iframe in-place so the widget appears
  // exactly where the embed snippet was pasted.
  if (self.parentNode) {
    self.parentNode.insertBefore(iframe, self);
  }
})();
