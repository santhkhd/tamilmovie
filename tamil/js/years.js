// JS: Years Page
document.addEventListener("DOMContentLoaded", async () => {
  const state = {
    all: [],
    selectedYear: null,
  };

  const els = {
    yearSearch: document.getElementById("yearSearchInput"),
    yearMin: document.getElementById("yearMin"),
    yearMax: document.getElementById("yearMax"),
    yearsGrid: document.getElementById("yearsGrid"),
    moviesGrid: document.getElementById("moviesGrid"),
    yearTemplate: document.getElementById("yearCardTemplate"),
    movieTemplate: document.getElementById("movieCardTemplate"),
    themeToggle: document.getElementById("themeToggle"),
  };

  const init = async () => {
    els.themeToggle.addEventListener("click", () => {
      const mode = ThemeManager.toggleTheme();
      els.themeToggle.textContent = mode === "dark" ? "🌙" : "☀️";
    });

    state.all = await MovieStore.loadMovies();
    
    // Check if year is selected from URL
    const params = new URLSearchParams(window.location.search);
    const yearParam = params.get("year");
    if (yearParam) {
      state.selectedYear = Number(yearParam);
      renderMoviesForYear(state.selectedYear);
    } else {
      renderYears();
    }

    els.yearSearch.addEventListener("input", debounce((e) => {
      const year = Number(e.target.value);
      if (year && year >= 1930 && year <= 2030) {
        state.selectedYear = year;
        renderMoviesForYear(year);
        window.history.pushState({}, "", `?year=${year}`);
      } else if (!e.target.value) {
        state.selectedYear = null;
        renderYears();
        window.history.pushState({}, "", "years.html");
      }
    }, 300));

    [els.yearMin, els.yearMax].forEach((input) =>
      input.addEventListener("input", debounce(() => {
        const min = Number(els.yearMin.value) || null;
        const max = Number(els.yearMax.value) || null;
        if (min || max) {
          filterYearsByRange(min, max);
        } else {
          renderYears();
        }
      }, 300))
    );
  };

  const filterYearsByRange = (minYear, maxYear) => {
    els.yearsGrid.style.display = "grid";
    els.moviesGrid.style.display = "none";
    els.yearsGrid.innerHTML = "";

    const yearMap = new Map();
    state.all.forEach(movie => {
      if (movie.year) {
        const year = movie.year;
        if ((!minYear || year >= minYear) && (!maxYear || year <= maxYear)) {
          if (!yearMap.has(year)) {
            yearMap.set(year, []);
          }
          yearMap.get(year).push(movie);
        }
      }
    });

    const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
    const fragment = document.createDocumentFragment();
    
    years.forEach(year => {
      const card = els.yearTemplate.content.cloneNode(true);
      const link = card.querySelector(".year-card__link");
      const yearEl = card.querySelector(".year-card__year");
      const countEl = card.querySelector(".year-card__count");
      
      yearEl.textContent = year;
      countEl.textContent = `${yearMap.get(year).length} movies`;
      link.href = `years.html?year=${year}`;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        state.selectedYear = year;
        renderMoviesForYear(year);
        window.history.pushState({}, "", `?year=${year}`);
      });

      fragment.appendChild(card);
    });

    els.yearsGrid.appendChild(fragment);
  };

  const renderYears = () => {
    els.yearsGrid.style.display = "grid";
    els.moviesGrid.style.display = "none";
    els.yearsGrid.innerHTML = "";

    const yearMap = new Map();
    state.all.forEach(movie => {
      if (movie.year) {
        if (!yearMap.has(movie.year)) {
          yearMap.set(movie.year, []);
        }
        yearMap.get(movie.year).push(movie);
      }
    });

    const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
    const fragment = document.createDocumentFragment();

    years.forEach(year => {
      const card = els.yearTemplate.content.cloneNode(true);
      const link = card.querySelector(".year-card__link");
      const yearEl = card.querySelector(".year-card__year");
      const countEl = card.querySelector(".year-card__count");
      
      yearEl.textContent = year;
      countEl.textContent = `${yearMap.get(year).length} movies`;
      link.href = `years.html?year=${year}`;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        state.selectedYear = year;
        renderMoviesForYear(year);
        window.history.pushState({}, "", `?year=${year}`);
      });

      fragment.appendChild(card);
    });

    els.yearsGrid.appendChild(fragment);
  };

  const renderMoviesForYear = (year) => {
    els.yearsGrid.style.display = "none";
    els.moviesGrid.style.display = "grid";
    els.moviesGrid.innerHTML = `<h2 style="width: 100%; margin-bottom: 1rem; grid-column: 1/-1;">Movies from ${year} (${state.all.filter(m => m.year === year).length})</h2>`;

    const movies = state.all.filter(m => m.year === year).sort((a, b) => {
      if (b.rating && a.rating) return b.rating - a.rating;
      if (b.rating) return 1;
      if (a.rating) return -1;
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

