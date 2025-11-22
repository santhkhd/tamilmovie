// JS: Navigation (Bottom Nav Active State)
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll(".bottom-nav__item");
  
  navItems.forEach((item) => {
    const href = item.getAttribute("href");
    if (href) {
      const itemPath = new URL(href, window.location.origin).pathname;
      // Check if current page matches this nav item
      if (
        currentPath.includes(itemPath) ||
        (currentPath.includes("details.html") && href.includes("details.html")) ||
        (currentPath.includes("index.html") && href.includes("index.html")) ||
        (currentPath === "/" && href.includes("index.html"))
      ) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    }
  });
});

