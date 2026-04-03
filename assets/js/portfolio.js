(function () {
  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  var reveals = document.querySelectorAll(".pf-reveal");

  if (prefersReduced) {
    reveals.forEach(function (el) {
      el.classList.add("pf-revealed");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var delay = entry.target.getAttribute("data-reveal-delay");
          if (delay) {
            entry.target.style.transitionDelay = delay + "ms";
          }
          entry.target.classList.add("pf-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -30px 0px",
    },
  );

  reveals.forEach(function (el) {
    observer.observe(el);
  });
})();
