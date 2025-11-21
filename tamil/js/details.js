// JS: Handlers (Details)
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("detailsRoot");
  const themeToggle = document.getElementById("themeToggle");
  themeToggle.addEventListener("click", () => {
    const mode = ThemeManager.toggleTheme();
    themeToggle.textContent = mode === "dark" ? "🌙" : "☀️";
  });

  const params = new URLSearchParams(window.location.search);
  const idParam = params.get("id");

  // Load movies efficiently
  const movies = await MovieStore.loadMovies();
  const movie =
    idParam === "random"
      ? movies[Math.floor(Math.random() * movies.length)]
      : movies.find((m) => `${m.id}` === idParam) || movies[0];

  if (!movie) {
    root.innerHTML = "<p>Movie not found.</p>";
    return;
  }

  document.title = `${movie.title} · Tamil Movies`;

  const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
  
  const hero = document.createElement("section");
  hero.className = "details-hero";
  hero.innerHTML = `
    <div class="poster">
      <img src="${movie.poster || defaultImg}" alt="${movie.title} poster" loading="eager" onerror="this.src='${defaultImg}'" />
    </div>
    <div class="hero-copy">
      <p class="eyebrow">${movie.genre.join(" · ")}</p>
      <h1>${movie.title} ${movie.year ? `(${movie.year})` : ""}</h1>
      <p>${movie.runtime}</p>
      <div class="rating-stars">${renderStars(movie.rating)}</div>
      <div class="hero-buttons">
        <a class="btn primary" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(
          movie.title + " full movie"
        )}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 0.5rem;">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Watch Full Movie
        </a>
        <a class="btn outline" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(
          movie.title + " trailer"
        )}">Watch Trailer</a>
        <button id="favoriteBtn" class="btn outline">${
          MovieStore.isFavorite(movie.id) ? "❤️ Saved" : "🤍 Favorite"
        }</button>
        <button id="shareBtn" class="btn ghost">Share</button>
      </div>
    </div>
  `;

  const grid = document.createElement("section");
  grid.className = "details-grid";
  grid.innerHTML = `
    ${detailCard("Plot", `<p>${movie.plot}</p>`)}
    ${detailCard("Highlights", listify([
      `Director: ${movie.director}`,
      `Writer: ${movie.writer}`,
      `Release: ${movie.released}`,
      `Awards: ${movie.awards || "—"}`,
    ]))}
    ${detailCard("Cast", listify(movie.cast?.slice(0, 12) || ["No cast data"]))}
  `;

  root.innerHTML = "";
  root.append(hero, grid);

  document
    .getElementById("favoriteBtn")
    .addEventListener("click", () => toggleFavorite(movie));
  document.getElementById("shareBtn").addEventListener("click", () => {
    MovieStore.shareMovie(movie).catch(() =>
      MovieStore.showToast("Unable to share right now")
    );
  });

  function toggleFavorite(movie) {
    if (MovieStore.isFavorite(movie.id)) {
      MovieStore.removeFavorite(movie.id);
      MovieStore.showToast("Removed from favorites");
      document.getElementById("favoriteBtn").textContent = "🤍 Favorite";
    } else {
      MovieStore.addFavorite(movie);
      MovieStore.showToast("Added to favorites");
      document.getElementById("favoriteBtn").textContent = "❤️ Saved";
    }
  }

  function renderStars(rating) {
    if (!rating) return "<span class='badge'>Not rated</span>";
    const stars = Math.round((rating / 10) * 5);
    return Array.from({ length: 5 })
      .map((_, idx) => (idx < stars ? "★" : "☆"))
      .join("");
  }

  function detailCard(title, body) {
    return `<article class="details-card"><h3>${title}</h3>${body}</article>`;
  }

  function listify(items) {
    return `<ul class="list">${items
      .map((item) => `<li>${item}</li>`)
      .join("")}</ul>`;
  }
});

