```javascript
/* =========================================================
   REDWAVE
   YouTube-powered music player
   ========================================================= */

/* =========================
   CONFIG
   ========================= */

const YOUTUBE_API_KEY = "AIzaSyDwK6p9mcWbkS446vAfwOp8X2iefo0rk80";

const YOUTUBE_SEARCH_API =
    "https://www.googleapis.com/youtube/v3/search";

const STORAGE_KEYS = {
    favorites: "redwave-favorites",
    recentlyPlayed: "redwave-recently-played",
    playlists: "redwave-playlists"
};


/* =========================
   STATE
   ========================= */

let youtubePlayer = null;
let youtubePlayerReady = false;

let pendingVideoId = null;
let pendingPlayRequest = false;

let searchAbortController = null;
let searchTimer = null;

let currentSongs = [];
let currentSongIndex = -1;
let currentSong = null;

let queue = [];
let queueIndex = -1;

let shuffleEnabled = false;
let repeatMode = "off";

let currentView = "home";
let currentPlaylistId = null;

let isPlaying = false;
let isMuted = false;

let progressTimer = null;


/* =========================
   DOM
   ========================= */

const searchInput = document.getElementById("searchInput");
const clearSearchButton = document.getElementById("clearSearch");

const musicGrid = document.getElementById("musicGrid");
const sectionLabel = document.getElementById("sectionLabel");
const sectionTitle = document.getElementById("sectionTitle");
const songCount = document.getElementById("songCount");
const searchStatus = document.getElementById("searchStatus");

const noResults = document.getElementById("noResults");
const emptyFavorites = document.getElementById("emptyFavorites");
const emptyRecent = document.getElementById("emptyRecent");
const emptyPlaylist = document.getElementById("emptyPlaylist");

const queuePanel = document.getElementById("queuePanel");
const queueButton = document.getElementById("queueButton");
const closeQueue = document.getElementById("closeQueue");
const queueList = document.getElementById("queueList");

const queueCover = document.getElementById("queueCover");
const queueTitle = document.getElementById("queueTitle");
const queueArtist = document.getElementById("queueArtist");

const youtubePlayerWrapper =
    document.querySelector(".youtube-player-wrapper");

const youtubePlayerElement =
    document.getElementById("youtubePlayer");


/* =========================
   PLAYER DOM
   ========================= */

const playerCover = document.getElementById("playerCover");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");

const playButton = document.getElementById("playButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const shuffleButton = document.getElementById("shuffleButton");
const repeatButton = document.getElementById("repeatButton");

const progressBar = document.getElementById("progressBar");
const currentTimeElement = document.getElementById("currentTime");
const durationElement = document.getElementById("duration");

const volumeBar = document.getElementById("volumeBar");
const muteButton = document.getElementById("muteButton");


/* =========================
   MODALS
   ========================= */

const createPlaylistModal =
    document.getElementById("createPlaylistModal");

const addToPlaylistModal =
    document.getElementById("addToPlaylistModal");

const spotifyImportModal =
    document.getElementById("spotifyImportModal");


/* =========================
   STORAGE
   ========================= */

function getStorage(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        const parsed = JSON.parse(value);

        return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
        console.warn("RedWave storage error:", error);
        return fallback;
    }
}

function setStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("RedWave could not save data:", error);
    }
}


/* =========================
   DATA
   ========================= */

function getFavorites() {
    return getStorage(STORAGE_KEYS.favorites);
}

function saveFavorites(items) {
    setStorage(STORAGE_KEYS.favorites, items);
}

function getRecentlyPlayed() {
    return getStorage(STORAGE_KEYS.recentlyPlayed);
}

function saveRecentlyPlayed(items) {
    setStorage(STORAGE_KEYS.recentlyPlayed, items);
}

function getPlaylists() {
    return getStorage(STORAGE_KEYS.playlists);
}

function savePlaylists(items) {
    setStorage(STORAGE_KEYS.playlists, items);
}


/* =========================
   HELPERS
   ========================= */

function escapeHTML(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${String(secs).padStart(2, "0")}`;
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getVideoUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

function getThumbnail(videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function isFavorite(song) {
    return getFavorites().some(
        item => item.videoId === song.videoId
    );
}


/* =========================
   YOUTUBE IFRAME API
   ========================= */

window.onYouTubeIframeAPIReady = function () {
    createYouTubePlayer();
};

function createYouTubePlayer() {
    if (!youtubePlayerElement) {
        console.error("RedWave: youtubePlayer element not found.");
        return;
    }

    if (typeof YT === "undefined" || !YT.Player) {
        console.warn("RedWave: YouTube API is not ready yet.");
        return;
    }

    youtubePlayer = new YT.Player("youtubePlayer", {
        width: "100%",
        height: "100%",

        playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
        },

        events: {
            onReady: onYouTubePlayerReady,
            onStateChange: onYouTubePlayerStateChange,
            onError: onYouTubePlayerError,
            onAutoplayBlocked: onYouTubeAutoplayBlocked
        }
    });
}

function onYouTubePlayerReady(event) {
    youtubePlayerReady = true;

    try {
        event.target.setVolume(
            Number(volumeBar?.value || 100)
        );
    } catch (error) {
        console.warn("Could not set YouTube volume:", error);
    }

    if (pendingVideoId && pendingPlayRequest) {
        const videoId = pendingVideoId;

        pendingVideoId = null;
        pendingPlayRequest = false;

        playYouTubeVideo(videoId);
    }
}

function onYouTubePlayerStateChange(event) {
    if (typeof YT === "undefined") {
        return;
    }

    switch (event.data) {
        case YT.PlayerState.PLAYING:
            isPlaying = true;
            updatePlayButton();
            showYouTubePlayer();
            startProgressTimer();
            break;

        case YT.PlayerState.PAUSED:
            isPlaying = false;
            updatePlayButton();
            stopProgressTimer();
            break;

        case YT.PlayerState.ENDED:
            isPlaying = false;
            updatePlayButton();
            stopProgressTimer();

            handleSongEnded();
            break;

        case YT.PlayerState.BUFFERING:
            showYouTubePlayer();
            break;

        case YT.PlayerState.CUED:
            break;

        default:
            break;
    }
}

function onYouTubePlayerError(event) {
    console.error(
        "RedWave YouTube player error:",
        event.data
    );

    /*
       Common YouTube player errors:

       2   = invalid video ID
       5   = HTML5 player error
       100 = video removed/private
       101 = embedding disabled
       150 = embedding disabled
       153 = missing referrer/client identification
    */

    if (event.data === 101 || event.data === 150) {
        setSearchStatus(
            "This video cannot be played inside RedWave. Try another result."
        );
    } else if (event.data === 100) {
        setSearchStatus(
            "This video is unavailable. Try another result."
        );
    } else if (event.data === 153) {
        setSearchStatus(
            "YouTube could not verify the player origin."
        );
    }
}

function onYouTubeAutoplayBlocked() {
    console.warn(
        "YouTube blocked scripted playback."
    );

    /*
       The user has already clicked the RedWave play button.
       We keep the video loaded so the native YouTube play
       button can be used if the browser blocks scripted playback.
    */

    isPlaying = false;
    updatePlayButton();

    setSearchStatus(
        "YouTube blocked automatic playback. Press play in the video player."
    );
}


/* =========================
   YOUTUBE PLAYBACK
   ========================= */

function playYouTubeVideo(videoId) {
    if (!videoId) {
        return;
    }

    pendingVideoId = videoId;
    pendingPlayRequest = true;

    if (!youtubePlayerReady || !youtubePlayer) {
        showYouTubePlayer();
        return;
    }

    try {
        /*
           loadVideoById() is important here.

           It loads the selected YouTube video AND starts playback.
        */
        youtubePlayer.loadVideoById(videoId);

        showYouTubePlayer();

        pendingVideoId = null;
        pendingPlayRequest = false;

        isPlaying = true;
        updatePlayButton();

    } catch (error) {
        console.error(
            "RedWave could not play YouTube video:",
            error
        );
    }
}

function togglePlayPause() {
    if (!youtubePlayerReady || !youtubePlayer) {
        if (currentSong?.videoId) {
            playYouTubeVideo(currentSong.videoId);
        }

        return;
    }

    try {
        const state = youtubePlayer.getPlayerState();

        if (
            state === YT.PlayerState.PLAYING ||
            state === YT.PlayerState.BUFFERING
        ) {
            youtubePlayer.pauseVideo();
        } else {
            youtubePlayer.playVideo();
        }
    } catch (error) {
        console.error(
            "RedWave play/pause error:",
            error
        );
    }
}

function pauseVideo() {
    if (!youtubePlayerReady || !youtubePlayer) {
        return;
    }

    try {
        youtubePlayer.pauseVideo();
    } catch (error) {
        console.warn(error);
    }
}

function stopVideo() {
    if (!youtubePlayerReady || !youtubePlayer) {
        return;
    }

    try {
        youtubePlayer.stopVideo();
    } catch (error) {
        console.warn(error);
    }
}

function showYouTubePlayer() {
    if (youtubePlayerWrapper) {
        youtubePlayerWrapper.classList.add("visible");
    }
}


/* =========================
   SEARCH
   ========================= */

function handleSearchInput() {
    const query = searchInput?.value.trim() || "";

    if (clearSearchButton) {
        clearSearchButton.style.display =
            query ? "flex" : "none";
    }

    clearTimeout(searchTimer);

    if (!query) {
        currentView = "home";
        currentPlaylistId = null;

        renderHome();

        return;
    }

    searchTimer = setTimeout(() => {
        searchYouTube(query);
    }, 400);
}

async function searchYouTube(query) {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
        return;
    }

    if (
        !YOUTUBE_API_KEY ||
        YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY_HERE"
    ) {
        setSearchStatus(
            "Add your YouTube Data API key to script.js first."
        );

        return;
    }

    if (searchAbortController) {
        searchAbortController.abort();
    }

    searchAbortController = new AbortController();

    currentView = "search";
    currentPlaylistId = null;

    showLoadingState();

    try {
        const params = new URLSearchParams({
            part: "snippet",
            q: cleanQuery,
            type: "video",
            maxResults: "25",
            videoEmbeddable: "true",
            key: YOUTUBE_API_KEY
        });

        const response = await fetch(
            `${YOUTUBE_SEARCH_API}?${params.toString()}`,
            {
                signal: searchAbortController.signal
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const reason =
                data?.error?.details?.find(
                    item =>
                        item["@type"] ===
                        "type.googleapis.com/google.rpc.ErrorInfo"
                )?.reason ||
                data?.error?.errors?.[0]?.reason ||
                "unknown";

            throw new Error(
                `YouTube API error: ${reason}`
            );
        }

        const results = Array.isArray(data.items)
            ? data.items
            : [];

        currentSongs = rankSearchResults(
            results,
            cleanQuery
        );

        renderSearchResults(
            currentSongs,
            cleanQuery
        );

    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error(error);

        currentSongs = [];

        renderSearchError(
            "YouTube search failed. Check the browser console for details."
        );
    }
}

function rankSearchResults(items, query) {
    const normalizedQuery = normalizeText(query);

    const mapped = items
        .filter(item => item?.id?.videoId)
        .map(item => {
            const videoId = item.id.videoId;

            const title =
                item.snippet?.title || "Unknown title";

            const channel =
                item.snippet?.channelTitle || "YouTube";

            const description =
                item.snippet?.description || "";

            const normalizedTitle =
                normalizeText(title);

            const normalizedChannel =
                normalizeText(channel);

            let score = 0;

            if (normalizedTitle === normalizedQuery) {
                score += 1000;
            }

            if (
                normalizedTitle.startsWith(
                    normalizedQuery
                )
            ) {
                score += 500;
            }

            if (
                normalizedChannel.startsWith(
                    normalizedQuery
                )
            ) {
                score += 350;
            }

            if (
                normalizedTitle.includes(
                    normalizedQuery
                )
            ) {
                score += 250;
            }

            if (
                normalizedChannel.includes(
                    normalizedQuery
                )
            ) {
                score += 150;
            }

            if (
                normalizeText(description).includes(
                    normalizedQuery
                )
            ) {
                score += 50;
            }

            const versionWords = [
                "slowed",
                "reverb",
                "remix",
                "sped up",
                "nightcore",
                "bass boosted",
                "8d",
                "lofi",
                "live",
                "acoustic",
                "official video",
                "lyrics"
            ];

            for (const word of versionWords) {
                if (
                    normalizedTitle.includes(
                        normalizeText(word)
                    )
                ) {
                    score += 5;
                }
            }

            return {
                videoId,

                title,

                artist: channel,

                description,

                thumbnail:
                    item.snippet?.thumbnails?.high?.url ||
                    item.snippet?.thumbnails?.medium?.url ||
                    item.snippet?.thumbnails?.default?.url ||
                    getThumbnail(videoId),

                publishedAt:
                    item.snippet?.publishedAt || "",

                score
            };
        });

    mapped.sort((a, b) => b.score - a.score);

    const seen = new Set();

    return mapped.filter(song => {
        const key =
            `${normalizeText(song.title)}|${normalizeText(song.artist)}`;

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;
    });
}


/* =========================
   RENDER SEARCH
   ========================= */

function showLoadingState() {
    if (!musicGrid) {
        return;
    }

    hideEmptyStates();

    if (sectionLabel) {
        sectionLabel.textContent = "Search";
    }

    if (sectionTitle) {
        sectionTitle.textContent = "Searching YouTube...";
    }

    if (songCount) {
        songCount.textContent = "";
    }

    if (searchStatus) {
        searchStatus.textContent =
            "Finding matching songs...";
    }

    musicGrid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Searching YouTube...</p>
        </div>
    `;
}

function renderSearchResults(songs, query) {
    hideEmptyStates();

    if (sectionLabel) {
        sectionLabel.textContent = "YouTube Search";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            `Results for "${query}"`;
    }

    if (songCount) {
        songCount.textContent =
            `${songs.length} result${songs.length === 1 ? "" : "s"}`;
    }

    if (searchStatus) {
        searchStatus.textContent =
            songs.length
                ? "Click a song to start playing."
                : "";
    }

    if (!songs.length) {
        showNoResults();
        return;
    }

    musicGrid.innerHTML =
        songs.map((song, index) =>
            createSongCard(song, index)
        ).join("");

    attachSongCardEvents();
}

function renderSearchError(message) {
    hideEmptyStates();

    if (sectionLabel) {
        sectionLabel.textContent = "Search";
    }

    if (sectionTitle) {
        sectionTitle.textContent = "Search error";
    }

    if (songCount) {
        songCount.textContent = "";
    }

    if (searchStatus) {
        searchStatus.textContent = message;
    }

    if (musicGrid) {
        musicGrid.innerHTML = `
            <div class="error-state">
                <p>${escapeHTML(message)}</p>
            </div>
        `;
    }
}

function createSongCard(song, index) {
    const favorite = isFavorite(song);

    const active =
        currentSong?.videoId === song.videoId;

    return `
        <article
            class="song-card ${active ? "active" : ""}"
            data-index="${index}"
            data-video-id="${escapeHTML(song.videoId)}"
        >
            <div class="song-artwork">
                <img
                    src="${escapeHTML(song.thumbnail)}"
                    alt="${escapeHTML(song.title)}"
                    loading="lazy"
                >

                <button
                    class="song-play-button"
                    data-action="play"
                    aria-label="Play ${escapeHTML(song.title)}"
                >
                    ▶
                </button>
            </div>

            <div class="song-card-info">
                <h3 title="${escapeHTML(song.title)}">
                    ${escapeHTML(song.title)}
                </h3>

                <p title="${escapeHTML(song.artist)}">
                    ${escapeHTML(song.artist)}
                </p>
            </div>

            <div class="song-card-actions">
                <button
                    class="favorite-button ${favorite ? "liked" : ""}"
                    data-action="favorite"
                    aria-label="Favorite"
                >
                    ${favorite ? "♥" : "♡"}
                </button>

                <button
                    class="song-more-button"
                    data-action="playlist"
                    aria-label="Add to playlist"
                >
                    +
                </button>
            </div>
        </article>
    `;
}

function attachSongCardEvents() {
    document
        .querySelectorAll(".song-card")
        .forEach(card => {
            const index =
                Number(card.dataset.index);

            const song =
                currentSongs[index];

            if (!song) {
                return;
            }

            card.addEventListener("dblclick", event => {
                if (
                    event.target.closest(
                        "button"
                    )
                ) {
                    return;
                }

                playSong(song, index);
            });

            card.addEventListener("click", event => {
                const actionButton =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!actionButton) {
                    return;
                }

                const action =
                    actionButton.dataset.action;

                if (action === "play") {
                    playSong(song, index);
                }

                if (action === "favorite") {
                    toggleFavorite(song);
                }

                if (action === "playlist") {
                    openAddToPlaylistModal(song);
                }
            });
        });
}


/* =========================
   PLAY SONG
   ========================= */

function playSong(song, index = -1) {
    if (!song || !song.videoId) {
        return;
    }

    currentSong = song;
    currentSongIndex = index;

    /*
       Keep the current search result list as the queue.
    */
    if (currentSongs.length) {
        queue = [...currentSongs];
        queueIndex = Math.max(
            0,
            currentSongIndex
        );
    }

    updatePlayerUI(song);
    updateQueueUI();
    updateActiveSongCards();

    addToRecentlyPlayed(song);

    playYouTubeVideo(song.videoId);
}

function updatePlayerUI(song) {
    if (playerTitle) {
        playerTitle.textContent =
            song.title || "Unknown title";
    }

    if (playerArtist) {
        playerArtist.textContent =
            song.artist || "YouTube";
    }

    if (playerCover) {
        playerCover.src =
            song.thumbnail || getThumbnail(song.videoId);

        playerCover.alt =
            song.title || "Current song";
    }

    if (queueCover) {
        queueCover.src =
            song.thumbnail || getThumbnail(song.videoId);
    }

    if (queueTitle) {
        queueTitle.textContent =
            song.title || "Unknown title";
    }

    if (queueArtist) {
        queueArtist.textContent =
            song.artist || "YouTube";
    }

    updatePlayButton();
}

function updateActiveSongCards() {
    document
        .querySelectorAll(".song-card")
        .forEach(card => {
            card.classList.toggle(
                "active",
                card.dataset.videoId ===
                    currentSong?.videoId
            );
        });
}


/* =========================
   PLAYLIST / QUEUE
   ========================= */

function handleSongEnded() {
    if (repeatMode === "one") {
        playYouTubeVideo(
            currentSong?.videoId
        );

        return;
    }

    playNextSong();
}

function playNextSong() {
    if (!queue.length) {
        return;
    }

    let nextIndex;

    if (shuffleEnabled) {
        if (queue.length === 1) {
            nextIndex = 0;
        } else {
            do {
                nextIndex =
                    Math.floor(
                        Math.random() *
                        queue.length
                    );
            } while (
                nextIndex === queueIndex
            );
        }
    } else {
        nextIndex = queueIndex + 1;

        if (nextIndex >= queue.length) {
            if (repeatMode === "all") {
                nextIndex = 0;
            } else {
                return;
            }
        }
    }

    queueIndex = nextIndex;

    const song = queue[queueIndex];

    if (!song) {
        return;
    }

    currentSong = song;

    const searchIndex =
        currentSongs.findIndex(
            item =>
                item.videoId ===
                song.videoId
        );

    currentSongIndex = searchIndex;

    updatePlayerUI(song);
    updateQueueUI();
    updateActiveSongCards();

    addToRecentlyPlayed(song);

    playYouTubeVideo(song.videoId);
}

function playPreviousSong() {
    if (!queue.length) {
        return;
    }

    let previousIndex =
        queueIndex - 1;

    if (previousIndex < 0) {
        if (repeatMode === "all") {
            previousIndex =
                queue.length - 1;
        } else {
            previousIndex = 0;
        }
    }

    queueIndex = previousIndex;

    const song = queue[queueIndex];

    if (!song) {
        return;
    }

    currentSong = song;

    const searchIndex =
        currentSongs.findIndex(
            item =>
                item.videoId ===
                song.videoId
        );

    currentSongIndex = searchIndex;

    updatePlayerUI(song);
    updateQueueUI();
    updateActiveSongCards();

    addToRecentlyPlayed(song);

    playYouTubeVideo(song.videoId);
}

function updateQueueUI() {
    if (!queueList) {
        return;
    }

    if (!queue.length) {
        queueList.innerHTML = `
            <div class="queue-empty">
                <p>Your queue is empty.</p>
            </div>
        `;

        return;
    }

    queueList.innerHTML =
        queue.map((song, index) => `
            <button
                class="queue-item ${
                    index === queueIndex
                        ? "active"
                        : ""
                }"
                data-queue-index="${index}"
            >
                <img
                    src="${escapeHTML(song.thumbnail)}"
                    alt=""
                >

                <span class="queue-item-text">
                    <strong>
                        ${escapeHTML(song.title)}
                    </strong>

                    <small>
                        ${escapeHTML(song.artist)}
                    </small>
                </span>
            </button>
        `).join("");

    queueList
        .querySelectorAll(".queue-item")
        .forEach(item => {
            item.addEventListener(
                "click",
                () => {
                    const index =
                        Number(
                            item.dataset.queueIndex
                        );

                    const song =
                        queue[index];

                    if (!song) {
                        return;
                    }

                    queueIndex = index;
                    currentSong = song;

                    const searchIndex =
                        currentSongs.findIndex(
                            current =>
                                current.videoId ===
                                song.videoId
                        );

                    currentSongIndex =
                        searchIndex;

                    updatePlayerUI(song);
                    updateActiveSongCards();
                    updateQueueUI();

                    addToRecentlyPlayed(song);

                    playYouTubeVideo(
                        song.videoId
                    );
                }
            );
        });
}


/* =========================
   FAVORITES
   ========================= */

function toggleFavorite(song) {
    const favorites =
        getFavorites();

    const existingIndex =
        favorites.findIndex(
            item =>
                item.videoId ===
                song.videoId
        );

    if (existingIndex >= 0) {
        favorites.splice(
            existingIndex,
            1
        );
    } else {
        favorites.unshift(song);
    }

    saveFavorites(favorites);

    if (
        currentView === "favorites"
    ) {
        renderFavorites();
    } else {
        refreshVisibleCards();
    }
}

function refreshVisibleCards() {
    if (
        currentView === "search" &&
        currentSongs.length
    ) {
        renderSearchResults(
            currentSongs,
            searchInput?.value.trim() || ""
        );
    }

    if (currentView === "home") {
        renderHome();
    }
}

function renderFavorites() {
    currentView = "favorites";
    currentPlaylistId = null;

    const favorites =
        getFavorites();

    hideEmptyStates();

    if (sectionLabel) {
        sectionLabel.textContent = "Library";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            "Liked Songs";
    }

    if (songCount) {
        songCount.textContent =
            `${favorites.length} song${
                favorites.length === 1
                    ? ""
                    : "s"
            }`;
    }

    if (!favorites.length) {
        showEmptyElement(emptyFavorites);
        return;
    }

    currentSongs = favorites;

    musicGrid.innerHTML =
        favorites.map(
            (song, index) =>
                createSongCard(song, index)
        ).join("");

    attachSongCardEvents();
}


/* =========================
   RECENTLY PLAYED
   ========================= */

function addToRecentlyPlayed(song) {
    let recent =
        getRecentlyPlayed();

    recent =
        recent.filter(
            item =>
                item.videoId !==
                song.videoId
        );

    recent.unshift(song);

    recent =
        recent.slice(0, 50);

    saveRecentlyPlayed(recent);
}

function renderRecentlyPlayed() {
    currentView = "recent";
    currentPlaylistId = null;

    const recent =
        getRecentlyPlayed();

    hideEmptyStates();

    if (sectionLabel) {
        sectionLabel.textContent = "Library";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            "Recently Played";
    }

    if (songCount) {
        songCount.textContent =
            `${recent.length} song${
                recent.length === 1
                    ? ""
                    : "s"
            }`;
    }

    if (!recent.length) {
        showEmptyElement(emptyRecent);
        return;
    }

    currentSongs = recent;

    musicGrid.innerHTML =
        recent.map(
            (song, index) =>
                createSongCard(song, index)
        ).join("");

    attachSongCardEvents();
}


/* =========================
   HOME
   ========================= */

function renderHome() {
    currentView = "home";
    currentPlaylistId = null;

    hideEmptyStates();

    if (sectionLabel) {
        sectionLabel.textContent =
            "Your Music";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            "Start Listening";
    }

    const recent =
        getRecentlyPlayed();

    if (songCount) {
        songCount.textContent =
            recent.length
                ? `${recent.length} recently played`
                : "";
    }

    if (!recent.length) {
        if (musicGrid) {
            musicGrid.innerHTML = `
                <div class="home-empty">
                    <h3>Search for a song</h3>
                    <p>
                        Find music on YouTube and
                        start building your RedWave library.
                    </p>
                </div>
            `;
        }

        return;
    }

    currentSongs = recent.slice(0, 12);

    if (musicGrid) {
        musicGrid.innerHTML =
            currentSongs.map(
                (song, index) =>
                    createSongCard(song, index)
            ).join("");

        attachSongCardEvents();
    }
}


/* =========================
   PLAYLISTS
   ========================= */

function renderPlaylists() {
    const playlists =
        getPlaylists();

    const container =
        document.getElementById(
            "playlistList"
        );

    if (!container) {
        return;
    }

    if (!playlists.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML =
        playlists.map(
            playlist => `
                <button
                    class="playlist-nav-item"
                    data-playlist-id="${escapeHTML(
                        playlist.id
                    )}"
                >
                    <span>♫</span>
                    <span>
                        ${escapeHTML(
                            playlist.name
                        )}
                    </span>
                </button>
            `
        ).join("");

    container
        .querySelectorAll(
            ".playlist-nav-item"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    openPlaylist(
                        button.dataset.playlistId
                    );
                }
            );
        });
}

function createPlaylist(name) {
    const cleanName =
        String(name || "").trim();

    if (!cleanName) {
        return;
    }

    const playlists =
        getPlaylists();

    const playlist = {
        id:
            `playlist-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        name: cleanName,

        songs: [],

        createdAt:
            new Date().toISOString()
    };

    playlists.push(playlist);

    savePlaylists(playlists);

    renderPlaylists();

    closeModal(createPlaylistModal);

    openPlaylist(playlist.id);
}

function openPlaylist(playlistId) {
    const playlists =
        getPlaylists();

    const playlist =
        playlists.find(
            item =>
                item.id === playlistId
        );

    if (!playlist) {
        return;
    }

    currentView = "playlist";
    currentPlaylistId =
        playlist.id;

    currentSongs =
        playlist.songs || [];

    hideEmptyStates();

    if (sectionLabel) {
        sectionLabel.textContent =
            "Playlist";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            playlist.name;
    }

    if (songCount) {
        songCount.textContent =
            `${currentSongs.length} song${
                currentSongs.length === 1
                    ? ""
                    : "s"
            }`;
    }

    if (!currentSongs.length) {
        showEmptyElement(emptyPlaylist);
        return;
    }

    musicGrid.innerHTML =
        currentSongs.map(
            (song, index) =>
                createSongCard(song, index)
        ).join("");

    attachSongCardEvents();
}

function addSongToPlaylist(
    playlistId,
    song
) {
    const playlists =
        getPlaylists();

    const playlist =
        playlists.find(
            item =>
                item.id === playlistId
        );

    if (!playlist) {
        return;
    }

    if (
        playlist.songs.some(
            item =>
                item.videoId ===
                song.videoId
        )
    ) {
        return;
    }

    playlist.songs.push(song);

    savePlaylists(playlists);

    renderPlaylists();

    closeModal(addToPlaylistModal);

    if (
        currentView === "playlist" &&
        currentPlaylistId === playlistId
    ) {
        openPlaylist(playlistId);
    }
}


/* =========================
   ADD TO PLAYLIST MODAL
   ========================= */

function openAddToPlaylistModal(song) {
    if (!addToPlaylistModal) {
        return;
    }

    addToPlaylistModal.dataset.videoId =
        song.videoId;

    addToPlaylistModal._song =
        song;

    const list =
        addToPlaylistModal.querySelector(
            ".playlist-options"
        );

    if (!list) {
        return;
    }

    const playlists =
        getPlaylists();

    if (!playlists.length) {
        list.innerHTML = `
            <p>
                Create a playlist first.
            </p>
        `;
    } else {
        list.innerHTML =
            playlists.map(
                playlist => `
                    <button
                        class="playlist-option"
                        data-playlist-id="${escapeHTML(
                            playlist.id
                        )}"
                    >
                        ${escapeHTML(
                            playlist.name
                        )}
                    </button>
                `
            ).join("");

        list
            .querySelectorAll(
                ".playlist-option"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        addSongToPlaylist(
                            button.dataset.playlistId,
                            song
                        );
                    }
                );
            });
    }

    openModal(addToPlaylistModal);
}


/* =========================
   SPOTIFY IMPORT
   ========================= */

function handleSpotifyImport(url) {
    const value =
        String(url || "").trim();

    if (!value) {
        return;
    }

    const match =
        value.match(
            /spotify\.com\/playlist\/([A-Za-z0-9]+)/
        );

    const result =
        document.getElementById(
            "spotifyImportResult"
        );

    if (!match) {
        if (result) {
            result.textContent =
                "That doesn't look like a Spotify playlist link.";
        }

        return;
    }

    const playlistId =
        match[1];

    if (result) {
        result.innerHTML = `
            <strong>Spotify playlist detected</strong>
            <br>
            Playlist ID: ${escapeHTML(
                playlistId
            )}
            <br><br>
            Automatic Spotify track importing is not
            enabled in this YouTube-only version yet.
        `;
    }
}


/* =========================
   MODALS
   ========================= */

function openModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.add("open");
}

function closeModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove("open");
}


/* =========================
   EMPTY STATES
   ========================= */

function hideEmptyStates() {
    [
        noResults,
        emptyFavorites,
        emptyRecent,
        emptyPlaylist
    ].forEach(element => {
        if (element) {
            element.style.display = "none";
        }
    });
}

function showEmptyElement(element) {
    hideEmptyStates();

    if (element) {
        element.style.display = "";
    }

    if (musicGrid) {
        musicGrid.innerHTML = "";
    }
}

function showNoResults() {
    showEmptyElement(noResults);
}


/* =========================
   PLAYER CONTROLS
   ========================= */

function updatePlayButton() {
    if (!playButton) {
        return;
    }

    playButton.textContent =
        isPlaying ? "❚❚" : "▶";

    playButton.setAttribute(
        "aria-label",
        isPlaying
            ? "Pause"
            : "Play"
    );
}

function toggleShuffle() {
    shuffleEnabled =
        !shuffleEnabled;

    if (shuffleButton) {
        shuffleButton.classList.toggle(
            "active",
            shuffleEnabled
        );
    }
}

function cycleRepeat() {
    if (repeatMode === "off") {
        repeatMode = "all";
    } else if (repeatMode === "all") {
        repeatMode = "one";
    } else {
        repeatMode = "off";
    }

    if (repeatButton) {
        repeatButton.classList.toggle(
            "active",
            repeatMode !== "off"
        );

        repeatButton.title =
            `Repeat: ${repeatMode}`;
    }
}

function toggleMute() {
    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }

    try {
        if (youtubePlayer.isMuted()) {
            youtubePlayer.unMute();

            isMuted = false;
        } else {
            youtubePlayer.mute();

            isMuted = true;
        }

        updateMuteButton();

    } catch (error) {
        console.warn(error);
    }
}

function updateMuteButton() {
    if (!muteButton) {
        return;
    }

    muteButton.textContent =
        isMuted ? "🔇" : "🔊";
}


/* =========================
   PROGRESS
   ========================= */

function startProgressTimer() {
    stopProgressTimer();

    progressTimer =
        setInterval(() => {
            updateProgress();
        }, 500);
}

function stopProgressTimer() {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
}

function updateProgress() {
    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }

    try {
        const current =
            youtubePlayer.getCurrentTime();

        const duration =
            youtubePlayer.getDuration();

        if (
            currentTimeElement
        ) {
            currentTimeElement.textContent =
                formatTime(current);
        }

        if (
            durationElement
        ) {
            durationElement.textContent =
                formatTime(duration);
        }

        if (
            progressBar &&
            duration > 0
        ) {
            progressBar.value =
                String(
                    (current / duration) * 100
                );
        }

    } catch (error) {
        // Player may not be ready yet.
    }
}

function seekFromProgress() {
    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }

    try {
        const duration =
            youtubePlayer.getDuration();

        const percent =
            Number(
                progressBar?.value || 0
            );

        youtubePlayer.seekTo(
            duration * (percent / 100),
            true
        );

    } catch (error) {
        console.warn(error);
    }
}

function changeVolume() {
    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }

    try {
        youtubePlayer.setVolume(
            Number(
                volumeBar?.value || 100
            )
        );

        if (
            Number(
                volumeBar?.value || 100
            ) > 0
        ) {
            youtubePlayer.unMute();
            isMuted = false;
            updateMuteButton();
        }

    } catch (error) {
        console.warn(error);
    }
}


/* =========================
   SEARCH CLEAR
   ========================= */

function clearSearch() {
    if (searchInput) {
        searchInput.value = "";
    }

    if (clearSearchButton) {
        clearSearchButton.style.display =
            "none";
    }

    currentView = "home";

    renderHome();
}


/* =========================
   NAVIGATION
   ========================= */

function setupNavigation() {
    const navItems =
        document.querySelectorAll(
            "[data-view]"
        );

    navItems.forEach(item => {
        item.addEventListener(
            "click",
            () => {
                const view =
                    item.dataset.view;

                if (view === "home") {
                    renderHome();
                }

                if (view === "favorites") {
                    renderFavorites();
                }

                if (view === "recent") {
                    renderRecentlyPlayed();
                }

                document
                    .querySelectorAll(
                        "[data-view]"
                    )
                    .forEach(
                        nav =>
                            nav.classList.toggle(
                                "active",
                                nav === item
                            )
                    );
            }
        );
    });
}


/* =========================
   KEYBOARD SHORTCUTS
   ========================= */

function setupKeyboardShortcuts() {
    document.addEventListener(
        "keydown",
        event => {
            const tag =
                event.target?.tagName;

            const typing =
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT";

            if (
                typing &&
                event.code !== "Escape"
            ) {
                return;
            }

            if (
                event.code === "Space"
            ) {
                event.preventDefault();

                togglePlayPause();
            }

            if (
                event.key.toLowerCase() === "m"
            ) {
                toggleMute();
            }

            if (
                event.key.toLowerCase() === "s"
            ) {
                toggleShuffle();
            }

            if (
                event.key.toLowerCase() === "r"
            ) {
                cycleRepeat();
            }

            if (
                event.key === "ArrowRight"
            ) {
                playNextSong();
            }

            if (
                event.key === "ArrowLeft"
            ) {
                playPreviousSong();
            }

            if (
                event.key === "Escape"
            ) {
                document
                    .querySelectorAll(".modal.open")
                    .forEach(closeModal);
            }
        }
    );
}


/* =========================
   EVENT SETUP
   ========================= */

function setupEvents() {
    if (searchInput) {
        searchInput.addEventListener(
            "input",
            handleSearchInput
        );
    }

    if (clearSearchButton) {
        clearSearchButton.addEventListener(
            "click",
            clearSearch
        );
    }

    if (playButton) {
        playButton.addEventListener(
            "click",
            togglePlayPause
        );
    }

    if (nextButton) {
        nextButton.addEventListener(
            "click",
            playNextSong
        );
    }

    if (previousButton) {
        previousButton.addEventListener(
            "click",
            playPreviousSong
        );
    }

    if (shuffleButton) {
        shuffleButton.addEventListener(
            "click",
            toggleShuffle
        );
    }

    if (repeatButton) {
        repeatButton.addEventListener(
            "click",
            cycleRepeat
        );
    }

    if (muteButton) {
        muteButton.addEventListener(
            "click",
            toggleMute
        );
    }

    if (progressBar) {
        progressBar.addEventListener(
            "input",
            seekFromProgress
        );
    }

    if (volumeBar) {
        volumeBar.addEventListener(
            "input",
            changeVolume
        );
    }

    if (queueButton) {
        queueButton.addEventListener(
            "click",
            () => {
                queuePanel?.classList.toggle(
                    "open"
                );
            }
        );
    }

    if (closeQueue) {
        closeQueue.addEventListener(
            "click",
            () => {
                queuePanel?.classList.remove(
                    "open"
                );
            }
        );
    }

    setupNavigation();
    setupKeyboardShortcuts();

    setupModalEvents();
}


/* =========================
   MODAL EVENTS
   ========================= */

function setupModalEvents() {
    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const modal =
                        button.closest(
                            ".modal"
                        );

                    closeModal(modal);
                }
            );
        });

    document
        .querySelectorAll(".modal")
        .forEach(modal => {
            modal.addEventListener(
                "click",
                event => {
                    if (
                        event.target ===
                        modal
                    ) {
                        closeModal(modal);
                    }
                }
            );
        });

    const createButton =
        document.getElementById(
            "createPlaylistButton"
        );

    if (createButton) {
        createButton.addEventListener(
            "click",
            () => {
                openModal(
                    createPlaylistModal
                );
            }
        );
    }

    const createForm =
        document.getElementById(
            "createPlaylistForm"
        );

    if (createForm) {
        createForm.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const input =
                    createForm.querySelector(
                        "input"
                    );

                createPlaylist(
                    input?.value || ""
                );

                if (input) {
                    input.value = "";
                }
            }
        );
    }

    const spotifyForm =
        document.getElementById(
            "spotifyImportForm"
        );

    if (spotifyForm) {
        spotifyForm.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const input =
                    spotifyForm.querySelector(
                        "input"
                    );

                handleSpotifyImport(
                    input?.value || ""
                );
            }
        );
    }

    const spotifyButton =
        document.getElementById(
            "spotifyImportButton"
        );

    if (spotifyButton) {
        spotifyButton.addEventListener(
            "click",
            () => {
                openModal(
                    spotifyImportModal
                );
            }
        );
    }
}


/* =========================
   INITIALIZATION
   ========================= */

function initializeRedWave() {
    renderPlaylists();

    renderHome();

    updatePlayButton();

    updateMuteButton();

    if (volumeBar) {
        volumeBar.value = "100";
    }

    /*
       If the YouTube script loaded before
       our script, initialize immediately.
    */
    if (
        typeof YT !== "undefined" &&
        YT.Player &&
        !youtubePlayer
    ) {
        createYouTubePlayer();
    }

    console.log(
        "RedWave initialized."
    );
}


/* =========================
   START
   ========================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            setupEvents();
            initializeRedWave();
        }
    );
} else {
    setupEvents();
    initializeRedWave();
}
```
