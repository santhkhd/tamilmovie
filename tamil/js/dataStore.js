// JS: Data
(() => {
  const DATA_URL = "imdb_tamil_movies_with_cast.json";
  const STORAGE_KEYS = {
    FAVORITES: "imdbFavorites_v2",
    THEME: "imdbTheme",
  };

  let moviesCache = [];
  let genreCache = [];

  /**
   * Upgrades Amazon image URLs to higher quality versions
   * - Upgrades quality from QL75 to QL100 (maximum quality)
   * - Increases dimensions (UY900 -> UY2000, UX600 -> UX2000)
   * - Removes crop parameters (CR...) to get full uncropped image
   * 
   * Example:
   * Input:  ...@._V1_QL75_UY900_CR5,0,90,133_.jpg
   * Output: ...@._V1_QL100_UY2000_.jpg
   */
  const upgradeAmazonImageUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    if (!url.includes("m.media-amazon.com")) return url;

    try {
      // Extract the base URL (everything before @._V1_)
      const baseMatch = url.match(/^(.+@\._V1_)/);
      if (!baseMatch) return url;

      const baseUrl = baseMatch[1];
      
      // Detect if it's width-based (UX) or height-based (UY)
      const isWidthBased = url.includes("UX");
      
      // Extract file extension (usually .jpg)
      const extMatch = url.match(/_\.(jpg|jpeg|png|webp)$/i);
      const extension = extMatch ? `_.${extMatch[1]}` : "_.jpg";
      
      // Build upgraded URL with maximum quality settings
      // QL100 = maximum quality (100%)
      // UY2000 = 2000px height OR UX2000 = 2000px width
      // No crop parameters for full image
      const dimension = isWidthBased ? "UX2000" : "UY2000";
      const upgraded = `${baseUrl}QL100_${dimension}_${extension}`;

      return upgraded;
    } catch (err) {
      console.warn("Failed to upgrade image URL:", url, err);
      return url;
    }
  };

  const normalizeMovie = (item) => {
    const year = Number(item.year) || null;
    const rating = Number(item.rating) || null;
    const rawPoster = item.poster || item.image;
    const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
    const poster = rawPoster
      ? upgradeAmazonImageUrl(rawPoster)
      : defaultImg;

    return {
      id: item.index ?? crypto.randomUUID(),
      title: item.title?.trim() || "Untitled",
      year,
      rating,
      genre: item.genre ? item.genre.split(",").map((g) => g.trim()) : [],
      runtime: item.runtime || "Unknown runtime",
      plot:
        item.plot ||
        "No plot summary available. Help the archive by adding one!",
      director: item.director || "Unknown director",
      writer: item.writer || "Unknown writer",
      cast: item.cast || [],
      awards: item.awards || "No awards data",
      released: item.released || "Unreleased",
      poster,
      streaming: item.streaming || "",
    };
  };

  const loadMovies = async () => {
    if (moviesCache.length) return moviesCache;
    const response = await fetch(DATA_URL);
    const raw = await response.json();
    moviesCache = raw.map(normalizeMovie);
    window.movies = moviesCache;
    genreCache = Array.from(
      new Set(moviesCache.flatMap((m) => m.genre).filter(Boolean))
    ).sort();
    return moviesCache;
  };

  const getGenres = () => genreCache;

  const getFavorites = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  };

  const saveFavorites = (list) => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(list));
  };

  const addFavorite = (movie) => {
    const favorites = getFavorites();
    if (favorites.some((f) => f.id === movie.id)) return favorites;
    const payload = { ...movie, savedAt: Date.now() };
    favorites.push(payload);
    saveFavorites(favorites);
    return favorites;
  };

  const removeFavorite = (movieId) => {
    const favorites = getFavorites().filter((f) => f.id !== movieId);
    saveFavorites(favorites);
    return favorites;
  };

  const isFavorite = (movieId) =>
    Boolean(getFavorites().find((m) => m.id === movieId));

  const persistTheme = (theme) =>
    localStorage.setItem(STORAGE_KEYS.THEME, theme);

  const getTheme = () =>
    localStorage.getItem(STORAGE_KEYS.THEME) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  };

  const toggleTheme = () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    return next;
  };

  const showToast = (message) => {
    const container =
      document.getElementById("toastContainer") ||
      (() => {
        const el = document.createElement("div");
        el.id = "toastContainer";
        el.className = "toast-container";
        document.body.appendChild(el);
        return el;
      })();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const buildPrompt = (movie) => {
    const characters =
      movie.cast && movie.cast.length
        ? movie.cast.slice(0, 5).join(", ")
        : "Invent compelling Tamil characters inspired by the film.";
    const tags = movie.genre.join(", ") || "Tamil cinema, classic";

    return [
      `Title: ${movie.title}`,
      `Plot summary: ${movie.plot}`,
      `Characters: ${characters}`,
      `Tags: ${tags}`,
      `Thumbnail prompt: Cinematic Tamil movie poster, ${movie.title}, ${tags}, volumetric lighting, ultra-detailed.`,
      `Voiceover script prompt: Deliver a dramatic Tamil narration for ${movie.title}, capturing tone similar to a festival trailer.`,
    ].join("\n\n");
  };

  const shareMovie = async (movie) => {
    const shareData = {
      title: movie.title,
      text: `${movie.title} (${movie.year}) · ${movie.plot.slice(0, 100)}…`,
      url: `${location.origin}${location.pathname.replace(
        /[^/]+$/,
        ""
      )}details.html?id=${movie.id}`,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
      showToast("Share link copied to clipboard");
    }
  };

  const registerServiceWorker = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("sw.js")
        .catch((err) => console.warn("SW registration failed", err));
    }
  };

  window.MovieStore = {
    loadMovies,
    getGenres,
    getFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    showToast,
    buildPrompt,
    shareMovie,
  };

  window.ThemeManager = {
    applyTheme,
    toggleTheme,
    getTheme,
  };

  if (document.readyState !== "loading") {
    applyTheme(getTheme());
    registerServiceWorker();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      applyTheme(getTheme());
      registerServiceWorker();
    });
  }
})();

