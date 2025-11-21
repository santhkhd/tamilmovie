// JS: Handlers (Favorites)
document.addEventListener("DOMContentLoaded", async () => {
  const els = {
    grid: document.getElementById("favoritesGrid"),
    search: document.getElementById("favSearchInput"),
    sort: document.getElementById("favSortSelect"),
    clear: document.getElementById("clearFavoritesBtn"),
    themeToggle: document.getElementById("themeToggle"),
  };

  let favorites = MovieStore.getFavorites();
  let filtered = [...favorites];

  const themeBtn = els.themeToggle;
  themeBtn.addEventListener("click", () => {
    const mode = ThemeManager.toggleTheme();
    themeBtn.textContent = mode === "dark" ? "🌙" : "☀️";
  });

  const render = () => {
    if (!filtered.length) {
      els.grid.classList.add("empty-state");
      els.grid.innerHTML = "<p>No favorites yet.</p>";
      return;
    }
    els.grid.classList.remove("empty-state");
    els.grid.innerHTML = "";
    filtered.forEach((movie) => {
      const card = document.createElement("article");
      card.className = "movie-card";
      card.innerHTML = `
        <div class="movie-card__media">
          <img src="${movie.poster}" alt="${movie.title}" loading="lazy" />
          <span class="movie-card__rating">${
            movie.rating ? `${movie.rating.toFixed(1)} ★` : "NR"
          }</span>
        </div>
        <div class="movie-card__body">
          <h3>${movie.title}</h3>
          <p class="movie-card__meta">${movie.year || "Year unknown"} · ${
        movie.genre.slice(0, 3).join(" · ") || "Genre?"
      }</p>
          <p class="movie-card__plot">${movie.plot.slice(0, 150)}${
        movie.plot.length > 150 ? "…" : ""
      }</p>
          <div class="movie-card__actions">
            <a class="btn tiny primary" href="details.html?id=${movie.id}">Details</a>
            <button class="btn tiny ghost" data-id="${movie.id}">Remove</button>
          </div>
        </div>`;
      els.grid.appendChild(card);
    });

    els.grid.querySelectorAll("button[data-id]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        MovieStore.removeFavorite(id);
        MovieStore.showToast("Removed from favorites");
        favorites = MovieStore.getFavorites();
        applyFilters();
      })
    );
  };

  const applyFilters = () => {
    const term = els.search.value.trim().toLowerCase();
    filtered = favorites.filter((movie) => {
      if (!term) return true;
      const haystack = [
        movie.title,
        movie.plot,
        movie.director,
        movie.cast?.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    filtered = sortList(filtered, els.sort.value);
    render();
  };

  const sortList = (list, key) => {
    const [prop, direction] = key.split("-");
    const sorted = [...list];
    const factor = direction === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (prop) {
        case "title":
          return a.title.localeCompare(b.title) * factor;
        case "rating":
          return (((a.rating || 0) - (b.rating || 0)) || 0) * factor;
        case "added":
          return ((a.savedAt || 0) - (b.savedAt || 0)) * factor;
        default:
          return 0;
      }
    });
    return sorted;
  };

  els.search.addEventListener("input", () => applyFilters());
  els.sort.addEventListener("change", () => applyFilters());
  els.clear.addEventListener("click", () => {
    if (!favorites.length) return;
    if (confirm("Clear all favorites?")) {
      localStorage.removeItem("imdbFavorites_v2");
      favorites = [];
      applyFilters();
      MovieStore.showToast("Cleared favorites");
    }
  });

  applyFilters();
});

