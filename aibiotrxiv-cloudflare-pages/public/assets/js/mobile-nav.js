// v48 mobile/tablet header navigation fix, rebuilt from v47.
// Only handles the responsive header menu.
(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var nav = document.querySelector(".nav");
    var links = document.querySelector(".nav-links");
    if (!nav || !links) return;

    var button = document.querySelector(".mobile-menu-toggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "mobile-menu-toggle";
      button.setAttribute("aria-label", "Open navigation menu");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Menu";
      nav.appendChild(button);
    }

    function closeMenu() {
      links.classList.remove("is-open");
      links.setAttribute("data-open", "false");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Menu";
    }

    function openMenu() {
      links.classList.add("is-open");
      links.setAttribute("data-open", "true");
      button.setAttribute("aria-expanded", "true");
      button.textContent = "Close";
    }

    button.addEventListener("click", function (event) {
      event.stopPropagation();
      if (links.classList.contains("is-open")) closeMenu();
      else openMenu();
    });

    links.addEventListener("click", function (event) {
      if (event.target && event.target.tagName === "A") closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target)) closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 980) closeMenu();
    });
  });
})();
