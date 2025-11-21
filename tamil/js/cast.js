// JS: Cast Page
document.addEventListener("DOMContentLoaded", async () => {
  const state = {
    all: [],
    selectedPerson: null,
    peopleMap: new Map(),
    searchTerm: "",
    activeLetter: "ALL",
    compactView: false,
    visiblePeople: 25,
  };

  const els = {
    castSearch: document.getElementById("castSearchInput"),
    castGrid: document.getElementById("castGrid"),
    moviesGrid: document.getElementById("moviesGrid"),
    castMoviesTitle: document.getElementById("castMoviesTitle"),
    castTemplate: document.getElementById("castCardTemplate"),
    movieTemplate: document.getElementById("movieCardTemplate"),
    themeToggle: document.getElementById("themeToggle"),
    clearSearch: document.getElementById("clearCastSearch"),
    compactToggle: document.getElementById("compactViewToggle"),
    alphaFilter: document.getElementById("alphaFilter"),
    loadMoreWrapper: document.getElementById("loadMorePeople"),
    loadMoreBtn: document.getElementById("loadMorePeopleBtn"),
    backToCast: document.getElementById("backToCastBtn"),
  };

  const init = async () => {
    els.themeToggle.addEventListener("click", () => {
      const mode = ThemeManager.toggleTheme();
      els.themeToggle.textContent = mode === "dark" ? "🌙" : "☀️";
    });

    state.all = await MovieStore.loadMovies();
    buildPeopleMap();

    const params = new URLSearchParams(window.location.search);
    const castParam = params.get("cast");
    if (castParam) {
      state.selectedPerson = decodeURIComponent(castParam);
      renderMoviesForPerson(state.selectedPerson);
    } else {
      renderPeople();
    }

    if (els.castSearch) {
      els.castSearch.addEventListener("input", debounce((e) => {
        state.searchTerm = e.target.value.trim().toLowerCase();
        resetVisiblePeople();
        renderPeople();
      }, 200));
    }

    if (els.clearSearch) {
      els.clearSearch.addEventListener("click", () => {
        if (!els.castSearch) return;
        els.castSearch.value = "";
        state.searchTerm = "";
        resetVisiblePeople();
        renderPeople();
        els.castSearch.focus();
      });
    }

    if (els.compactToggle) {
      els.compactToggle.addEventListener("click", () => {
        state.compactView = !state.compactView;
        updateCompactView();
      });
    }

    buildAlphaFilter();
    if (els.alphaFilter) {
      els.alphaFilter.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-letter]");
        if (!btn) return;
        const letter = btn.dataset.letter;
        if (state.activeLetter === letter) return;
        state.activeLetter = letter;
        updateAlphaFilterActive();
        resetVisiblePeople();
        renderPeople();
      });
    }

    updateCompactView();

    if (els.loadMoreBtn) {
      els.loadMoreBtn.addEventListener("click", () => {
        state.visiblePeople += 25;
        renderPeople();
      });
    }

    if (els.backToCast) {
      els.backToCast.addEventListener("click", () => {
        state.selectedPerson = null;
        showPeopleView();
        window.history.pushState({}, "", "cast.html");
      });
    }
  };

  const extractNames = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      return value
        .split(/[,/;&]/)
        .map((name) => name.trim())
        .filter(Boolean);
    }
    return [];
  };

  const addPerson = (rawName, movie, role) => {
    if (!rawName) return;
    const name = rawName.trim();
    if (!name) return;

    if (!state.peopleMap.has(name)) {
      state.peopleMap.set(name, { movies: [], roles: new Set() });
    }

    const person = state.peopleMap.get(name);
    if (!person.movies.some((m) => m.id === movie.id)) {
      person.movies.push(movie);
    }
    person.roles.add(role);
  };

  const buildPeopleMap = () => {
    state.peopleMap.clear();
    state.all.forEach((movie) => {
      if (Array.isArray(movie.cast)) {
        movie.cast.forEach((castName) => addPerson(castName, movie, "Cast"));
      }
      extractNames(movie.director).forEach((directorName) =>
        addPerson(directorName, movie, "Director")
      );
    });
  };

  const buildAlphaFilter = () => {
    if (!els.alphaFilter) return;
    const letters = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];
    const container = els.alphaFilter.querySelector('.alpha-filter__container') || els.alphaFilter;
    container.innerHTML = "";
    letters.forEach((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.letter = letter;
      btn.className = "alpha-filter__btn";
      btn.textContent = letter === "ALL" ? "All" : letter;
      if (letter === state.activeLetter) {
        btn.classList.add("is-active");
      }
      container.appendChild(btn);
    });
  };

  const updateAlphaFilterActive = () => {
    if (!els.alphaFilter) return;
    const container = els.alphaFilter.querySelector('.alpha-filter__container') || els.alphaFilter;
    container.querySelectorAll("button[data-letter]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.letter === state.activeLetter);
    });
  };

  const updateCompactView = () => {
    if (els.castGrid) {
      els.castGrid.classList.toggle("cast-grid--compact", state.compactView);
    }
    if (els.compactToggle) {
      els.compactToggle.setAttribute("aria-pressed", state.compactView ? "true" : "false");
      els.compactToggle.textContent = state.compactView ? "Comfort view" : "Compact cards";
    }
  };

  const renderPeople = () => {
    els.castGrid.style.display = "grid";
    els.moviesGrid.style.display = "none";
    els.castGrid.innerHTML = "";
    if (els.backToCast) {
      els.backToCast.style.display = "none";
    }

    let peopleList = Array.from(state.peopleMap.entries());
    
    if (state.searchTerm) {
      peopleList = peopleList.filter(([name]) =>
        name.toLowerCase().includes(state.searchTerm)
      );
    }

    if (state.activeLetter && state.activeLetter !== "ALL") {
      peopleList = peopleList.filter(([name]) => {
        const firstChar = (name.trim()[0] || "").toUpperCase();
        if (state.activeLetter === "#") {
          return !/^[A-Z]$/.test(firstChar);
        }
        return firstChar === state.activeLetter;
      });
    }

    peopleList.sort((a, b) => {
      // Sort by movie count (descending), then by name
      if (b[1].movies.length !== a[1].movies.length) {
        return b[1].movies.length - a[1].movies.length;
      }
      return a[0].localeCompare(b[0]);
    });

    const limitedList = peopleList.slice(0, state.visiblePeople);
    const fragment = document.createDocumentFragment();

    limitedList.forEach(([personName, personData]) => {
      const card = els.castTemplate.content.cloneNode(true);
      const link = card.querySelector(".cast-card__link");
      const nameEl = card.querySelector(".cast-card__name");
      const roleEl = card.querySelector(".cast-card__role");
      const countEl = card.querySelector(".cast-card__count");
      
      nameEl.textContent = personName;
      const roles = Array.from(personData.roles);
      roleEl.textContent = roles.length ? roles.join(" · ") : "Contributor";
      const movieCount = personData.movies.length;
      countEl.textContent = `${movieCount} movie${movieCount !== 1 ? 's' : ''}`;
      
      link.addEventListener("click", () => {
        state.selectedPerson = personName;
        renderMoviesForPerson(personName);
        window.history.pushState({}, "", `?cast=${encodeURIComponent(personName)}`);
      });

      fragment.appendChild(card);
    });

    els.castGrid.appendChild(fragment);

    if (els.loadMoreWrapper) {
      const hasMore = peopleList.length > state.visiblePeople;
      els.loadMoreWrapper.style.display = hasMore ? "flex" : "none";
    }
  };

  const renderMoviesForPerson = (personName) => {
    showMoviesView();
    const total = state.peopleMap.get(personName)?.movies.length || 0;
    els.castMoviesTitle.textContent = `Movies with ${personName} (${total})`;
    els.moviesGrid.innerHTML = "";
    els.moviesGrid.appendChild(els.castMoviesTitle);

    const movies = state.peopleMap.get(personName)?.movies || [];
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

  const showPeopleView = () => {
    els.castGrid.style.display = "grid";
    els.moviesGrid.style.display = "none";
    if (els.backToCast) {
      els.backToCast.style.display = "none";
    }
  };

  const showMoviesView = () => {
    els.castGrid.style.display = "none";
    els.moviesGrid.style.display = "grid";
    if (els.backToCast) {
      els.backToCast.style.display = "inline-flex";
    }
    if (els.loadMoreWrapper) {
      els.loadMoreWrapper.style.display = "none";
    }
  };

  const resetVisiblePeople = () => {
    state.visiblePeople = 25;
    if (els.loadMoreWrapper) {
      els.loadMoreWrapper.style.display = "none";
    }
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

