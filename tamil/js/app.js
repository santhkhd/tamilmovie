// JS: UI (Home)
document.addEventListener("DOMContentLoaded", () => {
  const state = {
    all: [],
    filtered: [],
    search: "",
    sortBy: "year",
    sortDirection: "asc", // Default: oldest to latest
    page: 1,
    pageSize: 36,
  };

  const els = {
    search: document.getElementById("searchInput"),
    sort: document.getElementById("sortSelect"),
    sortDirectionBtn: document.getElementById("sortDirectionBtn"),
    grid: document.getElementById("movieGrid"),
    sentinel: document.getElementById("scrollSentinel"),
    themeToggle: document.getElementById("themeToggle"),
    template: document.getElementById("movieCardTemplate"),
    movieCount: document.getElementById("movieCount"),
    searchClear: document.getElementById("searchClearBtn"),
  };

  let sentinelObserver;

  const init = async () => {
    attachEvents();
    updateSortDirectionIcon();
    state.all = await MovieStore.loadMovies();
    updateMovieCount();
    runPipeline();
    setupInfiniteScroll();
  };

  const attachEvents = () => {
    els.search.addEventListener("input", debounce((e) => {
      state.search = e.target.value.trim().toLowerCase();
      resetPage();
    }, 150));

    if (els.searchClear) {
      els.searchClear.addEventListener("click", () => {
        if (!els.search.value) return;
        els.search.value = "";
        state.search = "";
        resetPage();
        els.search.focus();
      });
    }

    els.sort.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      resetPage();
    });

    els.sortDirectionBtn.addEventListener("click", () => {
      state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      updateSortDirectionIcon();
      resetPage();
    });

    els.themeToggle.addEventListener("click", () => {
      const mode = ThemeManager.toggleTheme();
      els.themeToggle.textContent = mode === "dark" ? "🌙" : "☀️";
    });
  };

  const updateSortDirectionIcon = () => {
    const svg = els.sortDirectionBtn.querySelector("svg path");
    if (state.sortDirection === "asc") {
      svg.setAttribute("d", "M7 14l5-5 5 5z");
      els.sortDirectionBtn.setAttribute("aria-label", "Sort ascending");
    } else {
      svg.setAttribute("d", "M7 10l5 5 5-5z");
      els.sortDirectionBtn.setAttribute("aria-label", "Sort descending");
    }
  };

  const resetPage = () => {
    state.page = 1;
    runPipeline();
  };

  const runPipeline = () => {
    const filtered = state.all.filter((movie) => {
      if (!state.search) return true;
      const haystack = [
        movie.title,
        movie.plot,
        movie.director,
        movie.writer,
        movie.genre.join(" "),
        movie.cast.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(state.search);
    });

    state.filtered = sortList(filtered, state.sortBy, state.sortDirection);
    state.page = 1;
    renderMovies(true);
  };

  const updateMovieCount = () => {
    if (!els.movieCount) return;
    const total = state.all.length;
    const label = total === 1 ? "movie" : "movies";
    els.movieCount.textContent = `${total.toLocaleString()} ${label}`;
  };

  const parseRuntime = (runtime) => {
    if (!runtime || typeof runtime !== "string") return 0;
    // Extract minutes from strings like "120 min", "2h 30min", etc.
    const match = runtime.match(/(\d+)\s*(?:min|m|minutes?)/i);
    if (match) return Number(match[1]);
    const hourMatch = runtime.match(/(\d+)\s*h/i);
    if (hourMatch) return Number(hourMatch[1]) * 60;
    return 0;
  };

  const parseReleaseDate = (released) => {
    if (!released || typeof released !== "string") return 0;
    // Try to parse dates like "31 Oct 1931", "2020-01-15", etc.
    const date = new Date(released);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const sortList = (list, sortBy, direction) => {
    const sorted = [...list];
    const factor = direction === "asc" ? 1 : -1;
    const compareNumbers = (a, b) => {
      if (a === b) return 0;
      return a > b ? 1 : -1;
    };

    sorted.sort((a, b) => {
      switch (sortBy) {
        case "popularity": {
          const aPop = a.rating || (a.year ? a.year / 100 : 0);
          const bPop = b.rating || (b.year ? b.year / 100 : 0);
          return compareNumbers(aPop, bPop) * factor;
        }
        case "rating": {
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          return compareNumbers(aRating, bRating) * factor;
        }
        case "runtime": {
          const aRuntime = parseRuntime(a.runtime);
          const bRuntime = parseRuntime(b.runtime);
          return compareNumbers(aRuntime, bRuntime) * factor;
        }
        case "year": {
          const aYear = a.year ? Number(a.year) : null;
          const bYear = b.year ? Number(b.year) : null;
          if (!aYear && !bYear) return 0;
          if (!aYear) return 1;
          if (!bYear) return -1;
          return compareNumbers(aYear, bYear) * factor;
        }
        case "released": {
          const aReleased = parseReleaseDate(a.released);
          const bReleased = parseReleaseDate(b.released);
          return compareNumbers(aReleased, bReleased) * factor;
        }
        case "title":
          return a.title.localeCompare(b.title) * factor;
        default:
          return 0;
      }
    });

    return sorted;
  };

  const renderMovies = (reset = false) => {
    if (reset) {
      els.grid.innerHTML = "";
    }

    const previouslyRendered = reset ? 0 : els.grid.childElementCount;
    const targetCount = Math.min(state.filtered.length, state.page * state.pageSize);
    if (previouslyRendered >= targetCount) {
      toggleSentinel();
      return;
    }

    const slice = state.filtered.slice(previouslyRendered, targetCount);

    const fragment = document.createDocumentFragment();
    const favoritesSet = new Set(
      MovieStore.getFavorites().map((fav) => `${fav.id}`)
    );

    slice.forEach((movie) => {
      const card = els.template.content.cloneNode(true);
      const img = card.querySelector("img");
      const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";

      img.src = movie.poster || defaultImg;
      img.alt = `${movie.title} poster`;
      img.onerror = function() {
        this.src = defaultImg;
      };

      card.querySelector(".movie-card__title").textContent = movie.title;

      const yearEl = card.querySelector(".movie-card__year");
      yearEl.textContent = movie.year ? `Year: ${movie.year}` : "Year: N/A";
      yearEl.style.display = "block";

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

      const link = card.querySelector(".movie-card__link");
      link.href = `details.html?id=${movie.id}`;

      const favBtn = card.querySelector(".movie-card__favorite");
      const isFavorite = favoritesSet.has(`${movie.id}`);
      favBtn.classList.toggle("is-active", isFavorite);
      favBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlyFavorite = MovieStore.isFavorite(movie.id);
        if (currentlyFavorite) {
          MovieStore.removeFavorite(movie.id);
          favBtn.classList.remove("is-active");
          favoritesSet.delete(`${movie.id}`);
          MovieStore.showToast("Removed from favorites");
        } else {
          MovieStore.addFavorite(movie);
          favBtn.classList.add("is-active");
          favoritesSet.add(`${movie.id}`);
          MovieStore.showToast("Added to favorites");
        }
      });

      fragment.appendChild(card);
    });

    els.grid.appendChild(fragment);
    toggleSentinel();
  };

  const toggleSentinel = () => {
    if (!els.sentinel) return;
    const hasMore = state.filtered.length > state.page * state.pageSize;
    els.sentinel.style.display = hasMore ? "block" : "none";
  };

  const loadNextPage = () => {
    if (state.filtered.length === 0) return;
    if (state.page * state.pageSize >= state.filtered.length) {
      toggleSentinel();
      return;
    }
    state.page += 1;
    renderMovies();
  };

  const setupInfiniteScroll = () => {
    if (!els.sentinel) return;
    if (sentinelObserver) {
      sentinelObserver.disconnect();
    }
    sentinelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadNextPage();
          }
        });
      },
      { rootMargin: "200px 0px" }
    );
    sentinelObserver.observe(els.sentinel);
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
