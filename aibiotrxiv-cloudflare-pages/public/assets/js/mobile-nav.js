// v51 final mobile/tablet header navigation repair.
// Scope: header/menu only. Does not touch D1/R2/admin/PayPal/submission flows.
(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function memberHrefAndLabel() {
    // Keep it simple and compatible with the existing member.js behavior.
    // If the existing login link has already been updated, mirror it.
    var existing = document.querySelector("[data-member-link]");
    if (existing) return { href: existing.getAttribute("href") || "/member/login/", label: existing.textContent.trim() || "Login" };
    return { href: "/member/login/", label: "Login" };
  }

  ready(function () {
    var nav = document.querySelector(".topbar .nav") || document.querySelector(".nav");
    if (!nav) return;

    var legacyButton = nav.querySelector(".mobile-menu-toggle");
    if (legacyButton) legacyButton.style.display = "none";

    var oldPanel = nav.querySelector(".aibio-mobile-menu-panel");
    if (oldPanel) oldPanel.remove();

    var oldButton = nav.querySelector(".aibio-mobile-menu-button");
    if (oldButton) oldButton.remove();

    var button = document.createElement("button");
    button.type = "button";
    button.className = "aibio-mobile-menu-button";
    button.setAttribute("aria-label", "Open navigation menu");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Menu";

    var panel = document.createElement("nav");
    panel.className = "aibio-mobile-menu-panel";
    panel.setAttribute("aria-label", "Mobile navigation");

    function renderPanel() {
      var member = memberHrefAndLabel();
      var links = [
        ["Browse", "/browse/"],
        ["Submission", "/submit/"],
        ["Guidelines", "/guidelines/"],
        ["Topics", "/topics/"],
        ["Policies", "/policies/"],
        ["About", "/about/"],
        [member.label, member.href]
      ];
      panel.innerHTML = links.map(function (item) {
        return '<a href="' + item[1] + '">' + item[0] + '</a>';
      }).join("");
    }

    renderPanel();
    nav.appendChild(button);
    nav.appendChild(panel);

    function closeMenu() {
      panel.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Menu";
    }

    function openMenu() {
      renderPanel();
      panel.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      button.textContent = "Close";
    }

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (panel.classList.contains("is-open")) closeMenu();
      else openMenu();
    });

    panel.addEventListener("click", function (event) {
      if (event.target && event.target.tagName === "A") closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target)) closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1100) closeMenu();
    });
  });
})();
