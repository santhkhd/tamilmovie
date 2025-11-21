// JS: Genres Page
document.addEventListener("DOMContentLoaded", async () => {
  const state = {
    all: [],
    selectedGenre: null,
    genreMap: new Map(),
  };

  const els = {
    genreSearch: document.getElementById("genreSearchInput"),
    genresGrid: document.getElementById("genresGrid"),
    moviesGrid: document.getElementById("moviesGrid"),
    genreMoviesTitle: document.getElementById("genreMoviesTitle"),
    genreTemplate: document.getElementById("genreCardTemplate"),
    movieTemplate: document.getElementById("movieCardTemplate"),
    themeToggle: document.getElementById("themeToggle"),
  };

  const init = async () => {
    els.themeToggle.addEventListener("click", () => {
      const mode = ThemeManager.toggleTheme();
      els.themeToggle.textContent = mode === "dark" ? "🌙" : "☀️";
    });

    state.all = await MovieStore.loadMovies();
    
    // Build genre map
    state.all.forEach(movie => {
      if (movie.genre && movie.genre.length > 0) {
        movie.genre.forEach(genre => {
          if (genre && genre.trim()) {
            const genreName = genre.trim();
            if (!state.genreMap.has(genreName)) {
              state.genreMap.set(genreName, []);
            }
            state.genreMap.get(genreName).push(movie);
          }
        });
      }
    });

    // Check if genre is selected from URL
    const params = new URLSearchParams(window.location.search);
    const genreParam = params.get("genre");
    if (genreParam) {
      state.selectedGenre = decodeURIComponent(genreParam);
      renderMoviesForGenre(state.selectedGenre);
    } else {
      renderGenres();
    }

    els.genreSearch.addEventListener("input", debounce((e) => {
      const query = e.target.value.trim().toLowerCase();
      renderGenres(query);
    }, 200));
  };

  const renderGenres = (searchQuery = "") => {
    els.genresGrid.style.display = "grid";
    els.moviesGrid.style.display = "none";
    els.genresGrid.innerHTML = "";

    let genreList = Array.from(state.genreMap.entries());
    
    if (searchQuery) {
      genreList = genreList.filter(([name]) => 
        name.toLowerCase().includes(searchQuery)
      );
    }

    genreList.sort((a, b) => {
      // Sort by movie count (descending), then by name
      if (b[1].length !== a[1].length) {
        return b[1].length - a[1].length;
      }
      return a[0].localeCompare(b[0]);
    });

    const fragment = document.createDocumentFragment();

    genreList.forEach(([genreName, movies]) => {
      const card = els.genreTemplate.content.cloneNode(true);
      const link = card.querySelector(".genre-card__link");
      const nameEl = card.querySelector(".genre-card__name");
      const countEl = card.querySelector(".genre-card__count");
      
      nameEl.textContent = genreName;
      countEl.textContent = `${movies.length} movie${movies.length !== 1 ? 's' : ''}`;
      
      link.addEventListener("click", () => {
        state.selectedGenre = genreName;
        renderMoviesForGenre(genreName);
        window.history.pushState({}, "", `?genre=${encodeURIComponent(genreName)}`);
      });

      fragment.appendChild(card);
    });

    els.genresGrid.appendChild(fragment);
  };

  const renderMoviesForGenre = (genreName) => {
    els.genresGrid.style.display = "none";
    els.moviesGrid.style.display = "grid";
    els.genreMoviesTitle.textContent = `${genreName} Movies (${state.genreMap.get(genreName)?.length || 0})`;
    els.moviesGrid.innerHTML = "";
    els.moviesGrid.appendChild(els.genreMoviesTitle);

    const movies = state.genreMap.get(genreName) || [];
    movies.sort((a, b) => {
      if (b.rating && a.rating) return b.rating - a.rating;
      if (b.rating) return 1;
      if (a.rating) return -1;
      if (b.year && a.year) return b.year - a.year;
      return a.title.localeCompare(b.title);
    });

    const fragment = document.createDocumentFragment();
    const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";

    movies.forEach(movie => {
      const card = els.movieTemplate.content.cloneNode(true);
      const img = card.querySelector("img");
      img.src = movie.poster || defaultImg;
      img.alt = `${movie.title} poster`;
      img.onerror = function() {
        this.src = defaultImg;
      };

      card.querySelector(".movie-card__title").textContent = movie.title;
      const ratingEl = card.querySelector(".movie-card__rating");
      const hasRating = typeof movie.rating === "number" && !Number.isNaN(movie.rating);
      if (hasRating) {
        ratingEl.textContent = movie.rating.toFixed(1);
        ratingEl.classList.remove("is-missing");
      } else {
        ratingEl.textContent = "NR";
        ratingEl.classList.add("is-missing");
      }
      ratingEl.style.display = "block";

      const yearEl = card.querySelector(".movie-card__year");
      yearEl.textContent = movie.year ? `Year: ${movie.year}` : "Year: N/A";
      yearEl.style.display = "block";

      card.querySelector(".movie-card__link").href = `details.html?id=${movie.id}`;
      fragment.appendChild(card);
    });

    els.moviesGrid.appendChild(fragment);
  };

  function debounce(fn, delay = 200) {
    let id;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), delay);
    };
  }

  init();
});

