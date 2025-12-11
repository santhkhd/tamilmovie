
// State
const state = {
    allMovies: [],
    loading: true,
    favorites: JSON.parse(localStorage.getItem('imdbFavorites_v2') || '[]'),
    params: new URLSearchParams(window.location.search),
    theme: localStorage.getItem('imdbTheme') || 'dark',
    // Search/Filter state for Index/Results pages
    searchTerm: '',
    page: 1,
    pageSize: 36,
    filters: { sortBy: 'year', sortDirection: 'asc' },
    // Cast page state
    castTab: 'cast',
    castFilter: '',
    castPage: 1
};

// DOM Elements
const app = document.getElementById('app');
const themeToggle = document.getElementById('themeToggle');

// --- Utils ---

const upgradeAmazonImageUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    if (!url.includes("m.media-amazon.com")) return url;
    try {
        const baseMatch = url.match(/^(.+@\._V1_)/);
        if (!baseMatch) return url;
        const baseUrl = baseMatch[1];
        const isWidthBased = url.includes("UX");
        const extMatch = url.match(/_\.(jpg|jpeg|png|webp)$/i);
        const extension = extMatch ? `_.${extMatch[1]}` : "_.jpg";
        const dimension = isWidthBased ? "UX600" : "UY600";
        return `${baseUrl}QL100_${dimension}_${extension}`;
    } catch (err) { return url; }
};

const parseRuntime = (str) => {
    if (!str) return 0;
    // Extract number from "165 min"
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};

const parseReleaseDate = (str, year) => {
    if (str) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.getTime();
    }
    // Fallback to year if release date missing
    if (year) return new Date(year, 0, 1).getTime();
    return 0;
};

const normalizeMovie = (item) => {
    const rawPoster = item.poster || item.image;
    const defaultImg = "default.png";
    const poster = rawPoster ? upgradeAmazonImageUrl(rawPoster) : defaultImg;
    const runtimeMins = parseRuntime(item.runtime);
    const releaseTimestamp = parseReleaseDate(item.released, item.year);

    return {
        id: item._id || item.index || crypto.randomUUID(),
        title: item.title?.trim() || "Untitled",
        year: Number(item.year) || null,
        rating: Number(item.rating) || null,
        genre: item.genre ? item.genre.split(",").map((g) => g.trim()) : [],
        runtime: item.runtime || "N/A",
        runtimeMins, // For sorting
        released: item.released || "",
        releaseTimestamp, // For sorting
        plot: item.plot || "No plot summary available.",
        director: item.director || "Unknown director",
        cast: item.cast || [],
        poster
    };
};

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// --- Core Logic ---

const init = async () => {
    applyTheme();
    setupThemeToggle();
    highlightActiveNav();

    try {
        const res = await fetch('imdb_tamil_movies_with_cast.json');
        const data = await res.json();
        state.allMovies = data.map(normalizeMovie);
        state.loading = false;

        // Determine Page
        const path = window.location.pathname;
        if (path.includes('details.html')) renderDetails();
        else if (path.includes('years.html')) renderYears();
        else if (path.includes('cast.html')) renderCast();
        else if (path.includes('favorites.html')) renderFavorites();
        else if (path.includes('results.html')) renderFiltered();
        else renderHome(); // Default to index/home logic

    } catch (err) {
        console.error(err);
        app.innerHTML = `<div class="text-center text-red-500 py-20">Failed to load data. Please ensure JSON is present.</div>`;
    }
};

const applyTheme = () => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
        root.classList.add('dark');
        document.querySelector('[data-lucide="moon"]')?.classList.add('hidden');
        document.querySelector('[data-lucide="sun"]')?.classList.remove('hidden');
    } else {
        root.classList.remove('dark');
        document.querySelector('[data-lucide="moon"]')?.classList.remove('hidden');
        document.querySelector('[data-lucide="sun"]')?.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
};

const setupThemeToggle = () => {
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('imdbTheme', state.theme);
            applyTheme();
        });
    }
};

const highlightActiveNav = () => {
    const path = window.location.pathname;
    let page = 'home';
    if (path.includes('years.html')) page = 'years';
    else if (path.includes('cast.html')) page = 'cast';
    else if (path.includes('favorites.html')) page = 'favorites';

    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.getAttribute('data-page') === page) el.classList.add('text-primary');
        else el.classList.remove('text-primary');
    });
};

// --- Components ---

const movieCard = (movie) => {
    // Note: Link goes to details.html?id=...
    return `
        <a href="details.html?id=${movie.id}" class="group relative bg-white dark:bg-[#1f1f1f] rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block">
            <div class="aspect-[2/3] w-full relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src="${movie.poster}" alt="${movie.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                <div class="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <h3 class="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-md">${movie.title}</h3>
                    <div class="flex items-center gap-2 mt-1 text-gray-200 text-xs font-medium">
                        <span>${movie.year || 'N/A'}</span>
                        ${movie.rating ? `<span class="flex items-center gap-0.5 text-yellow-400"><i data-lucide="star" class="w-3 h-3 fill-current"></i> ${movie.rating}</span>` : ''}
                    </div>
                </div>
            </div>
        </a>
    `;
};

const renderGrid = (movies, showSearch = true, title = null) => {
    const moviesToShow = movies.slice(0, state.page * state.pageSize);

    return `
        <div class="space-y-6 fade-in">
             <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                ${title ? `
                    <div class="flex items-center gap-3">
                        <button onclick="history.back()" class="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <i data-lucide="arrow-left" class="w-6 h-6 text-gray-600 dark:text-gray-300"></i>
                        </button>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">${title}</h2>
                            <span class="text-sm text-gray-500 font-medium">${movies.length} movies</span>
                        </div>
                    </div>
                ` : ''}

                ${showSearch ? `
                 <div class="relative w-full sm:w-64">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                    <input type="text" id="searchInput" 
                        value="${state.searchTerm}"
                        placeholder="Search..." 
                        class="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                 </div>
                ` : ''}
            </div>

            <!-- Grid -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                ${moviesToShow.map(movieCard).join('')}
            </div>
            
            ${moviesToShow.length === 0 ? `<div class="text-center py-20 text-gray-500">No movies found.</div>` : ''}
            
            ${moviesToShow.length < movies.length ? `
                <div class="flex justify-center py-8">
                    <button id="loadMoreBtn" class="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 px-6 py-2 rounded-full font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Load More
                    </button>
                </div>
            ` : ''}
        </div>
    `;
};

// --- Pages ---

const renderHome = () => {
    // Logic similar to previous Home but without dynamic title injection usually
    let results = state.allMovies.filter(m => {
        if (!state.searchTerm) return true;
        const term = state.searchTerm.toLowerCase();
        return m.title.toLowerCase().includes(term) ||
            m.cast.some(c => c.toLowerCase().includes(term)) ||
            m.director.toLowerCase().includes(term);
    });

    // Sort
    const sortFn = (a, b) => {
        let valA, valB;

        switch (state.filters.sortBy) {
            case 'year':
                valA = a.year; valB = b.year;
                if (!valA && valB) return 1;
                if (valA && !valB) return -1;
                if (!valA && !valB) return 0;
                break;
            case 'rating':
                valA = a.rating || 0; valB = b.rating || 0;
                break;
            case 'title':
                valA = a.title.toLowerCase(); valB = b.title.toLowerCase();
                break;
            case 'runtime':
                valA = a.runtimeMins; valB = b.runtimeMins;
                break;
            case 'released':
                valA = a.releaseTimestamp; valB = b.releaseTimestamp;
                break;
            case 'popularity': // Fallback to rating or random if not real
                valA = a.rating || 0; valB = b.rating || 0;
                break;
            default:
                valA = a.year; valB = b.year;
        }

        if (state.filters.sortDirection === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
    };
    results.sort(sortFn);

    const moviesToShow = results.slice(0, state.page * state.pageSize);

    app.innerHTML = `
        <div class="space-y-6 fade-in">
            <!-- Search & Filter for Home -->
            <div class="flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#1f1f1f] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div class="relative flex-1">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"></i>
                    <input type="text" id="searchInput" 
                        value="${state.searchTerm}"
                        placeholder="Search movies, cast, director..." 
                        class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#2b2b2b] border-none rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary outline-none">
                </div>
                <div class="flex gap-2">
                    <select id="sortSelect" class="bg-gray-50 dark:bg-[#2b2b2b] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm border-none outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                        <option value="year" ${state.filters.sortBy === 'year' ? 'selected' : ''}>Year</option>
                        <option value="title" ${state.filters.sortBy === 'title' ? 'selected' : ''}>A-Z</option>
                        <option value="rating" ${state.filters.sortBy === 'rating' ? 'selected' : ''}>User Rating</option>
                        <option value="runtime" ${state.filters.sortBy === 'runtime' ? 'selected' : ''}>Run Time</option>
                        <option value="released" ${state.filters.sortBy === 'released' ? 'selected' : ''}>Release Date</option>
                        <!-- Popularity placeholder, maps to rating for now as we lack vote counts -->
                        <option value="popularity" ${state.filters.sortBy === 'popularity' ? 'selected' : ''}>Popularity (Rating)</option>
                    </select>
                    <button id="sortDirBtn" class="p-2 bg-gray-50 dark:bg-[#2b2b2b] rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <i data-lucide="${state.filters.sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                ${moviesToShow.map(movieCard).join('')}
            </div>
            
            ${moviesToShow.length === 0 ? `<div class="text-center py-20 text-gray-500">No movies found.</div>` : ''}
            
            ${moviesToShow.length < results.length ? `
                <div class="flex justify-center py-8">
                    <button id="loadMoreBtn" class="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 px-6 py-2 rounded-full font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Load More
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    // Listeners
    document.getElementById('searchInput').addEventListener('input', debounce((e) => {
        state.searchTerm = e.target.value;
        state.page = 1;
        renderHome();
    }, 300));
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        state.filters.sortBy = e.target.value;
        renderHome();
    });
    document.getElementById('sortDirBtn').addEventListener('click', () => {
        state.filters.sortDirection = state.filters.sortDirection === 'asc' ? 'desc' : 'asc';
        renderHome();
    });
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) loadBtn.addEventListener('click', () => {
        state.page++;
        renderHome();
    });
    lucide.createIcons();
};

const renderDetails = () => {
    const id = state.params.get('id');
    const movie = state.allMovies.find(m => String(m.id) === String(id));

    if (!movie) {
        app.innerHTML = `<div class="text-center py-20">Movie not found</div>`;
        return;
    }

    const isFav = state.favorites.some(f => f.id === movie.id);
    const isOld = movie.year && movie.year < 2005;

    app.innerHTML = `
        <div class="animate-in fade-in duration-500">
            <button onclick="history.back()" class="mb-4 flex items-center text-gray-500 hover:text-primary transition-colors">
                <i data-lucide="arrow-left" class="w-5 h-5 mr-1"></i> Back
            </button>

            <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-800">
                <div class="md:flex">
                    <div class="md:w-1/3 lg:w-1/4 relative">
                        <div class="aspect-[2/3] w-full relative">
                            <img src="${movie.poster}" alt="${movie.title}" class="w-full h-full object-cover">
                        </div>
                    </div>

                    <div class="p-6 md:p-8 md:w-2/3 lg:w-3/4 flex flex-col">
                        <div class="flex justify-between items-start">
                            <div>
                                <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 font-display">${movie.title}</h1>
                                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                                    <a href="results.html?type=year&value=${movie.year}" class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex items-center gap-1 hover:text-primary"><i data-lucide="calendar" class="w-3 h-3"></i> ${movie.year || 'N/A'}</a>
                                    ${movie.rating ? `<span class="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-2 py-1 rounded flex items-center gap-1"><i data-lucide="star" class="w-3 h-3 fill-current"></i> ${movie.rating}</span>` : ''}
                                    <span class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${movie.runtime}</span>
                                </div>
                            </div>
                            <button id="favBtn" class="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition ${isFav ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}">
                                <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-current' : ''}"></i>
                            </button>
                        </div>

                        <div class="flex flex-wrap gap-2 mb-6">
                            ${movie.genre.map(g => `<a href="results.html?type=genre&value=${encodeURIComponent(g)}" class="text-xs font-semibold px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors">${g}</a>`).join('')}
                        </div>

                        <div class="mb-8">
                            <h3 class="text-sm uppercase tracking-wider text-gray-400 font-bold mb-2">Synopsis</h3>
                            <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">${movie.plot}</p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-sm">
                            <div>
                                <h3 class="text-gray-400 font-bold mb-1 uppercase tracking-wider text-xs">Director</h3>
                                <a href="results.html?type=director&value=${encodeURIComponent(movie.director)}" class="text-gray-900 dark:text-white font-medium text-base hover:text-primary">${movie.director}</a>
                            </div>
                            <div>
                                <h3 class="text-gray-400 font-bold mb-1 uppercase tracking-wider text-xs">Cast</h3>
                                <div class="flex flex-wrap gap-1">
                                    ${movie.cast.map(c => `<a href="results.html?type=cast&value=${encodeURIComponent(c)}" class="text-gray-900 dark:text-white font-medium text-base hover:text-primary">${c}</a>`).join(', ')}
                                </div>
                            </div>
                        </div>

                        <div class="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} tamil trailer${isOld ? " old" : ""}`)}', '_blank')" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2">
                                <i data-lucide="youtube" class="w-5 h-5"></i> Watch Trailer
                            </button>
                            <button onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} tamil full movie${isOld ? " old" : ""}`)}', '_blank')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                                <i data-lucide="play-circle" class="w-5 h-5"></i> Watch Full Movie
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('favBtn').addEventListener('click', () => {
        toggleFavorite(movie);
        renderDetails(); // Re-render to update icon
    });
    lucide.createIcons();
};

const renderFiltered = () => {
    const type = state.params.get('type');
    const value = state.params.get('value');
    let results = [];
    let title = '';

    if (type === 'year') {
        title = `Year: ${value}`;
        results = state.allMovies.filter(m => String(m.year) === String(value));
    } else if (type === 'cast') {
        title = `Cast: ${value}`;
        results = state.allMovies.filter(m => m.cast && m.cast.some(c => c.toLowerCase() === value.toLowerCase()));
    } else if (type === 'director') {
        title = `Director: ${value}`;
        results = state.allMovies.filter(m => m.director && m.director.toLowerCase() === value.toLowerCase());
    } else if (type === 'genre') {
        title = `Genre: ${value}`;
        results = state.allMovies.filter(m => m.genre && m.genre.some(g => g.toLowerCase() === value.toLowerCase()));
    } else {
        title = 'Results';
        results = [];
    }

    if (state.searchTerm) {
        results = results.filter(m => m.title.toLowerCase().includes(state.searchTerm.toLowerCase()));
    }

    // Use same logic as home typically or simple year desc
    results.sort((a, b) => {
        const valA = a.year;
        const valB = b.year;
        if (!valA && valB) return 1;
        if (valA && !valB) return -1;
        return valB - valA;
    });

    app.innerHTML = renderGrid(results, true, title);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            state.searchTerm = e.target.value;
            state.page = 1;
            renderFiltered();
        }, 300));
    }
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) loadBtn.addEventListener('click', () => {
        state.page++;
        renderFiltered();
    });
    lucide.createIcons();
};

const renderFavorites = () => {
    let results = state.favorites.filter(m => {
        if (!state.searchTerm) return true;
        const term = state.searchTerm.toLowerCase();
        return m.title.toLowerCase().includes(term);
    });

    app.innerHTML = renderGrid(results, true, 'Favorites');

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            state.searchTerm = e.target.value;
            state.page = 1;
            renderFavorites();
        }, 300));
    }
    lucide.createIcons();
};

const renderYears = () => {
    const yearsSet = new Set(state.allMovies.map(m => m.year).filter(y => y));
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    app.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Browse by Year</h2>
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                ${years.map(year => `
                    <a href="results.html?type=year&value=${year}" class="p-4 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-primary hover:text-primary text-center font-bold text-gray-800 dark:text-gray-200 transition-colors">
                        ${year}
                    </a>
                `).join('')}
            </div>
        </div>
    `;
    lucide.createIcons();
};

const renderCast = () => {
    let list = [];
    const counts = {};

    if (state.castTab === 'cast') {
        state.allMovies.forEach(m => {
            m.cast.forEach(c => {
                const name = c.trim();
                if (name) counts[name] = (counts[name] || 0) + 1;
            });
        });
    } else {
        state.allMovies.forEach(m => {
            const d = m.director.trim();
            if (d && d !== "Unknown director") counts[d] = (counts[d] || 0) + 1;
        });
    }

    list = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    if (state.castFilter) {
        list = list.filter(item => item.name.toLowerCase().includes(state.castFilter.toLowerCase()));
    }

    const pageSize = 40;
    const totalPages = Math.ceil(list.length / pageSize);
    const paginatedList = list.slice((state.castPage - 1) * pageSize, state.castPage * pageSize);

    app.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 class="text-3xl font-bold text-gray-900 dark:text-white font-display">
                        Browse by ${state.castTab === 'cast' ? 'Cast' : 'Director'}
                    </h2>
                    <div class="relative w-full sm:w-72">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                        <input type="text" id="castSearchInput" 
                            value="${state.castFilter}"
                            placeholder="Search ${state.castTab === 'cast' ? 'actors' : 'directors'}..." 
                            class="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm">
                    </div>
                </div>

                <div class="flex p-1 bg-gray-100 dark:bg-[#1f1f1f] rounded-xl self-start">
                    <button id="tabCast" class="px-6 py-2 rounded-lg text-sm font-semibold transition-all ${state.castTab === 'cast' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}">Actors</button>
                    <button id="tabDirector" class="px-6 py-2 rounded-lg text-sm font-semibold transition-all ${state.castTab === 'director' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}">Directors</button>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                ${paginatedList.map(item => `
                    <a href="results.html?type=${state.castTab}&value=${encodeURIComponent(item.name)}" class="flex items-center gap-3 p-3 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-primary/30 hover:shadow-md hover:scale-[1.02] transition-all text-left">
                        <div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0">
                            <i data-lucide="${state.castTab === 'cast' ? 'user' : 'video'}" class="w-5 h-5"></i>
                        </div>
                         <div class="min-w-0">
                            <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">${item.name}</p>
                            <p class="text-xs text-gray-500 font-medium">${item.count} ${item.count === 1 ? 'movie' : 'movies'}</p>
                        </div>
                    </a>
                `).join('')}
            </div>

            ${paginatedList.length === 0 ? `<div class="text-center py-20 text-gray-500">No results found.</div>` : ''}

            ${totalPages > 1 ? `
                 <div class="flex justify-center items-center gap-4 mt-8">
                    <button id="prevPage" ${state.castPage === 1 ? 'disabled' : ''} class="p-2 rounded-lg bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800">
                        <i data-lucide="chevron-left" class="w-5 h-5"></i>
                    </button>
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Page ${state.castPage} of ${totalPages}</span>
                    <button id="nextPage" ${state.castPage === totalPages ? 'disabled' : ''} class="p-2 rounded-lg bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800">
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </button>
                 </div>
            ` : ''}
        </div>
    `;

    lucide.createIcons();
    attachCastEvents(totalPages);
};

const attachCastEvents = (totalPages) => {
    document.getElementById('castSearchInput').addEventListener('input', debounce((e) => {
        state.castFilter = e.target.value;
        state.castPage = 1;
        renderCast();
    }, 300));

    document.getElementById('tabCast').addEventListener('click', () => {
        state.castTab = 'cast';
        state.castPage = 1;
        state.castFilter = '';
        renderCast();
    });
    document.getElementById('tabDirector').addEventListener('click', () => {
        state.castTab = 'director';
        state.castPage = 1;
        state.castFilter = '';
        renderCast();
    });

    const prevBtn = document.getElementById('prevPage');
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (state.castPage > 1) { state.castPage--; renderCast(); }
    });

    const nextBtn = document.getElementById('nextPage');
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (state.castPage < totalPages) { state.castPage++; renderCast(); }
    });
};

const toggleFavorite = (movie) => {
    const idx = state.favorites.findIndex(f => f.id === movie.id);
    if (idx === -1) {
        state.favorites.push({ ...movie, savedAt: Date.now() });
    } else {
        state.favorites.splice(idx, 1);
    }
    localStorage.setItem('imdbFavorites_v2', JSON.stringify(state.favorites));
};

// Initialize
init();
