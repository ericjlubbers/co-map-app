/**
 * CO Map App — Responsive Embed Loader
 * Finds co-map iframes and sizes them based on aspect ratio data attributes.
 *
 * Usage:
 *   <iframe src="…/embed/ID" data-co-map
 *     data-ratio-desktop="16:9"
 *     data-ratio-mobile="3:4"
 *     data-height="600"
 *     data-height-unit="auto"
 *     width="100%" height="600" frameborder="0"
 *     style="border:0" allowfullscreen></iframe>
 *   <script src="https://maps.coloradosun.com/embed.js" defer></script>
 *
 * Behavior:
 *   - "auto" height-unit: calculates height from container width × aspect ratio
 *     (desktop ratio on screens >= 768px, mobile ratio on < 768px)
 *   - "px" height-unit: sets a fixed pixel height
 *   - "vh" height-unit: sets height as a percentage of viewport height
 *   - Falls back to 600px if no data attributes are present
 */
(function () {
  "use strict";

  var MOBILE_BREAKPOINT = 768;

  function parseRatio(str) {
    if (!str) return null;
    var parts = str.split(":");
    if (parts.length !== 2) return null;
    var w = parseFloat(parts[0]);
    var h = parseFloat(parts[1]);
    if (!w || !h || w <= 0 || h <= 0) return null;
    return h / w;
  }

  function sizeIframes() {
    var iframes = document.querySelectorAll("iframe[data-co-map]");
    var isMobile = window.innerWidth < MOBILE_BREAKPOINT;

    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i];
      var heightUnit = iframe.getAttribute("data-height-unit") || "auto";
      var heightVal = parseFloat(iframe.getAttribute("data-height")) || 600;

      // Ensure block layout so no inline-element baseline gap appears below the iframe
      iframe.style.display = "block";

      if (heightUnit === "px") {
        iframe.style.height = heightVal + "px";
      } else if (heightUnit === "vh") {
        // Support separate desktop/mobile vh via data-vh-desktop / data-vh-mobile
        var vhDesktop = parseFloat(iframe.getAttribute("data-vh-desktop")) || heightVal;
        var vhMobile = parseFloat(iframe.getAttribute("data-vh-mobile")) || heightVal;
        iframe.style.height = (isMobile ? vhMobile : vhDesktop) + "vh";
      } else {
        // auto — use aspect ratio
        var ratioStr = isMobile
          ? iframe.getAttribute("data-ratio-mobile")
          : iframe.getAttribute("data-ratio-desktop");
        var ratio = parseRatio(ratioStr);

        if (ratio) {
          var containerWidth =
            iframe.parentElement ? iframe.parentElement.offsetWidth : window.innerWidth;
          iframe.style.height = Math.round(containerWidth * ratio) + "px";
        } else {
          iframe.style.height = heightVal + "px";
        }
      }
    }
  }

  // Run on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sizeIframes);
  } else {
    sizeIframes();
  }

  // Re-run on resize (debounced)
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeIframes, 150);
  });
})();
