/* =========================================================
   REDWAVE
   YouTube Music System
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

// KEEP YOUR API KEY HERE.
// Do NOT paste it into chat.

const YOUTUBE_API_KEY = "AIzaSyDwK6p9mcWbkS446vAfwOp8X2iefo0rk80";

const YOUTUBE_SEARCH_API =
    "https://www.googleapis.com/youtube/v3/search";


const STORAGE_KEYS = {

    favorites: "redwave-favorites",

    recentlyPlayed: "redwave-recently-played",

    playlists: "redwave-playlists"

};


/* =========================================================
   DOM
   ========================================================= */

const searchInput =
    document.getElementById("searchInput");

const clearSearchButton =
    document.getElementById("clearSearchButton");

const musicGrid =
    document.getElementById("musicGrid");

const searchStatus =
    document.getElementById("searchStatus");

const noResults =
    document.getElementById("noResults");

const emptyFavorites =
    document.getElementById("emptyFavorites");

const emptyRecent =
    document.getElementById("emptyRecent");

const emptyPlaylist =
    document.getElementById("emptyPlaylist");

const sectionLabel =
    document.getElementById("sectionLabel");

const sectionTitle =
    document.getElementById("sectionTitle");

const songCount =
    document.getElementById("songCount");

const startListeningButton =
    document.getElementById("startListeningButton");


/* PLAYER */

const playerCover =
    document.getElementById("playerCover");

const playerTitle =
    document.getElementById("playerTitle");

const playerArtist =
    document.getElementById("playerArtist");

const playPauseButton =
    document.getElementById("playPauseButton");

const previousButton =
    document.getElementById("previousButton");

const nextButton =
    document.getElementById("nextButton");

const shuffleButton =
    document.getElementById("shuffleButton");

const repeatButton =
    document.getElementById("repeatButton");

const progressBar =
    document.getElementById("progressBar");

const currentTimeElement =
    document.getElementById("currentTime");

const durationElement =
    document.getElementById("duration");

const volumeSlider =
    document.getElementById("volumeSlider");

const volumeIcon =
    document.getElementById("volumeIcon");


/* YOUTUBE */

const youtubePlayerWrapper =
    document.querySelector(".youtube-player-wrapper");


/* QUEUE */

const queueButton =
    document.getElementById("queueButton");

const queuePanel =
    document.getElementById("queuePanel");

const queueOverlay =
    document.getElementById("queueOverlay");

const closeQueueButton =
    document.getElementById("closeQueueButton");

const queueList =
    document.getElementById("queueList");

const queueCurrentCover =
    document.getElementById("queueCurrentCover");

const queueCurrentTitle =
    document.getElementById("queueCurrentTitle");

const queueCurrentArtist =
    document.getElementById("queueCurrentArtist");


/* PLAYLIST */

const createPlaylistButton =
    document.getElementById("createPlaylistButton");

const playlistModal =
    document.getElementById("playlistModal");

const closePlaylistModal =
    document.getElementById("closePlaylistModal");

const cancelPlaylistButton =
    document.getElementById("cancelPlaylistButton");

const savePlaylistButton =
    document.getElementById("savePlaylistButton");

const playlistNameInput =
    document.getElementById("playlistNameInput");

const sidebarPlaylists =
    document.getElementById("sidebarPlaylists");


/* ADD TO PLAYLIST */

const addPlaylistModal =
    document.getElementById("addPlaylistModal");

const closeAddPlaylistModal =
    document.getElementById("closeAddPlaylistModal");

const playlistPicker =
    document.getElementById("playlistPicker");


/* SPOTIFY */

const openSpotifyImport =
    document.getElementById("openSpotifyImport");

const spotifyImportModal =
    document.getElementById("spotifyImportModal");

const closeSpotifyImport =
    document.getElementById("closeSpotifyImport");

const cancelSpotifyImport =
    document.getElementById("cancelSpotifyImport");

const spotifyPlaylistInput =
    document.getElementById("spotifyPlaylistInput");

const checkSpotifyPlaylist =
    document.getElementById("checkSpotifyPlaylist");

const spotifyImportResult =
    document.getElementById("spotifyImportResult");


/* =========================================================
   STATE
   ========================================================= */

let youtubePlayer = null;

let youtubeReady = false;

let searchResults = [];

let currentSongIndex = -1;

let currentView = "home";

let currentPlaylistId = null;

let shuffleEnabled = false;

let repeatMode = 0;
// 0 = off
// 1 = repeat all
// 2 = repeat one

let isLoadingSearch = false;

let currentAddPlaylistSong = null;

let searchTimer = null;

let searchController = null;

let lastSearchRequest = 0;

let progressTimer = null;

let currentSong = null;


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function readStorage(key, fallback = []) {

    try {

        const value =
            localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        const parsed =
            JSON.parse(value);

        return Array.isArray(parsed)
            ? parsed
            : fallback;

    } catch (error) {

        console.error(
            "Storage read error:",
            error
        );

        return fallback;

    }

}


function writeStorage(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

    } catch (error) {

        console.error(
            "Storage write error:",
            error
        );

    }

}


function getFavorites() {

    return readStorage(
        STORAGE_KEYS.favorites
    );

}


function getRecentlyPlayed() {

    return readStorage(
        STORAGE_KEYS.recentlyPlayed
    );

}


function getPlaylists() {

    return readStorage(
        STORAGE_KEYS.playlists
    );

}


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;

}


function formatTime(seconds) {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        Math.floor(seconds % 60);

    return (
        minutes +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );

}


function normalizeText(text) {

    return String(text || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();

}


function createId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );

}


/* =========================================================
   YOUTUBE SONG NORMALIZATION
   ========================================================= */

function normalizeYouTubeSong(item) {

    if (!item) {
        return null;
    }

    const videoId =
        item.id?.videoId ||
        item.videoId ||
        "";

    if (!videoId) {
        return null;
    }

    const snippet =
        item.snippet || {};

    const title =
        snippet.title ||
        item.title ||
        "Unknown song";

    const artist =
        snippet.channelTitle ||
        item.artist ||
        "YouTube";

    const thumbnail =
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {

        id: videoId,

        videoId,

        title,

        artist,

        album: "YouTube",

        artwork: thumbnail,

        duration: Number(item.duration) || 0,

        source: "YouTube"

    };

}


/* =========================================================
   SEARCH
   ========================================================= */

async function searchYouTube(query) {

    const cleanQuery =
        query.trim();

    if (!cleanQuery) {

        searchResults = [];

        hideAllEmptyStates();

        renderHome();

        return;

    }


    if (!YOUTUBE_API_KEY ||
        YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY_HERE") {

        searchStatus.textContent =
            "Add your YouTube API key in script.js first.";

        musicGrid.innerHTML = "";

        return;

    }


    if (searchController) {
        searchController.abort();
    }

    searchController =
        new AbortController();


    const requestId =
        ++lastSearchRequest;

    isLoadingSearch = true;

    hideAllEmptyStates();

    musicGrid.innerHTML = "";

    searchStatus.textContent =
        `Searching YouTube for "${cleanQuery}"...`;

    songCount.textContent = "";


    const params =
        new URLSearchParams({

            part: "snippet",

            q: cleanQuery,

            type: "video",

            maxResults: "25",

            videoEmbeddable: "true",

            key: YOUTUBE_API_KEY

        });


    try {

        const response =
            await fetch(
                `${YOUTUBE_SEARCH_API}?${params.toString()}`,
                {
                    signal:
                        searchController.signal
                }
            );


        if (requestId !== lastSearchRequest) {
            return;
        }


        if (!response.ok) {

            let errorMessage =
                "YouTube search failed.";

            try {

                const errorData =
                    await response.json();

                const reason =
                    errorData?.error?.errors?.[0]?.reason;

                if (reason) {
                    errorMessage =
                        `YouTube API error: ${reason}`;
                }

            } catch (_) {}

            throw new Error(errorMessage);

        }


        const data =
            await response.json();


        let results =
            (data.items || [])
                .map(normalizeYouTubeSong)
                .filter(Boolean);


        results =
            rankSearchResults(
                results,
                cleanQuery
            );


        results =
            deduplicateSongs(results);


        searchResults =
            results;


        isLoadingSearch = false;


        if (results.length === 0) {

            searchStatus.textContent =
                `No YouTube results found for "${cleanQuery}"`;

            musicGrid.innerHTML = "";

            noResults.classList.remove("hidden");

            sectionLabel.textContent =
                "Search";

            sectionTitle.textContent =
                `"${cleanQuery}"`;

            songCount.textContent =
                "0 results";

            return;

        }


        sectionLabel.textContent =
            "YouTube Search";

        sectionTitle.textContent =
            `"${cleanQuery}"`;

        songCount.textContent =
            `${results.length} results`;

        searchStatus.textContent =
            `Showing results for "${cleanQuery}"`;

        renderMusicCards(results);

    } catch (error) {

        if (error.name === "AbortError") {
            return;
        }

        console.error(error);

        isLoadingSearch = false;

        musicGrid.innerHTML = "";

        searchStatus.textContent =
            error.message ||
            "Unable to search YouTube.";

        songCount.textContent = "";

    }

}


/* =========================================================
   SEARCH RANKING
   ========================================================= */

function rankSearchResults(
    songs,
    query
) {

    const normalizedQuery =
        normalizeText(query);

    const queryWords =
        normalizedQuery
            .split(" ")
            .filter(Boolean);


    return songs
        .map((song, index) => {

            const title =
                normalizeText(song.title);

            const artist =
                normalizeText(song.artist);

            let score = 0;


            if (title === normalizedQuery) {
                score += 1000;
            }

            if (title.startsWith(normalizedQuery)) {
                score += 700;
            }

            if (artist.startsWith(normalizedQuery)) {
                score += 500;
            }

            if (title.includes(normalizedQuery)) {
                score += 400;
            }

            if (artist.includes(normalizedQuery)) {
                score += 250;
            }


            for (const word of queryWords) {

                if (title.includes(word)) {
                    score += 80;
                }

                if (artist.includes(word)) {
                    score += 50;
                }

            }


            const versionWords = [

                "slowed",

                "slowed reverb",

                "remix",

                "sped up",

                "speed up",

                "nightcore",

                "8d",

                "cover",

                "live",

                "lofi",

                "instrumental",

                "acoustic"

            ];


            for (const version of versionWords) {

                if (
                    title.includes(version) &&
                    normalizedQuery.length > 3
                ) {
                    score += 20;
                }

            }


            return {

                song,

                score,

                originalIndex: index

            };

        })

        .sort(
            (a, b) =>
                b.score - a.score ||
                a.originalIndex - b.originalIndex
        )

        .map(item => item.song);

}


/* =========================================================
   DEDUPLICATION
   ========================================================= */

function deduplicateSongs(songs) {

    const seen = new Set();

    return songs.filter(song => {

        const key =
            normalizeText(
                `${song.title} ${song.artist}`
            );

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;

    });

}


/* =========================================================
   RENDER MUSIC CARDS
   ========================================================= */

function renderMusicCards(songs) {

    hideAllEmptyStates();

    musicGrid.innerHTML = "";


    songs.forEach(
        (song, index) => {

            const card =
                document.createElement("article");

            card.className =
                "music-card";

            card.dataset.index =
                String(index);

            if (
                currentSong &&
                currentSong.videoId === song.videoId
            ) {

                card.classList.add("active");

            }


            const liked =
                isFavorite(song);


            card.innerHTML = `

                <div class="album-container">

                    <img
                        src="${escapeHTML(song.artwork)}"
                        alt="${escapeHTML(song.title)}"
                        loading="lazy"
                    >

                    <div class="card-actions">

                        <button
                            class="card-action favorite-action ${liked ? "liked" : ""}"
                            title="${liked ? "Remove from liked songs" : "Like song"}"
                        >
                            ${liked ? "♥" : "♡"}
                        </button>

                        <button
                            class="card-action playlist-action"
                            title="Add to playlist"
                        >
                            +
                        </button>

                    </div>

                    <button
                        class="card-play-button"
                        title="Play"
                    >
                        ▶
                    </button>

                </div>

                <div
                    class="music-card-title"
                    title="${escapeHTML(song.title)}"
                >
                    ${escapeHTML(song.title)}
                </div>

                <div
                    class="music-card-artist"
                    title="${escapeHTML(song.artist)}"
                >
                    ${escapeHTML(song.artist)}
                </div>

                <div class="youtube-badge">
                    YouTube
                </div>

            `;


            const playButton =
                card.querySelector(
                    ".card-play-button"
                );

            const favoriteButton =
                card.querySelector(
                    ".favorite-action"
                );

            const playlistButton =
                card.querySelector(
                    ".playlist-action"
                );


            playButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    playSong(index);

                }
            );


            favoriteButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    toggleFavorite(song);

                    renderMusicCards(
                        searchResults
                    );

                }
            );


            playlistButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    openAddToPlaylist(song);

                }
            );


            card.addEventListener(
                "dblclick",
                () => {

                    playSong(index);

                }
            );


            card.addEventListener(
                "click",
                () => {

                    playSong(index);

                }
            );


            musicGrid.appendChild(card);

        }
    );

}


/* =========================================================
   EMPTY STATES
   ========================================================= */

function hideAllEmptyStates() {

    noResults.classList.add("hidden");

    emptyFavorites.classList.add("hidden");

    emptyRecent.classList.add("hidden");

    emptyPlaylist.classList.add("hidden");

}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

    hideAllEmptyStates();

    musicGrid.innerHTML = "";

    sectionLabel.textContent =
        "RedWave";

    sectionTitle.textContent =
        "Start listening";

    songCount.textContent = "";

    searchStatus.textContent =
        "Search for a song, artist, remix or album.";

}


/* =========================================================
   FAVORITES
   ========================================================= */

function songKey(song) {

    return song?.videoId ||
        song?.id ||
        "";

}


function isFavorite(song) {

    const key =
        songKey(song);

    return getFavorites()
        .some(
            item =>
                songKey(item) === key
        );

}


function toggleFavorite(song) {

    const favorites =
        getFavorites();

    const key =
        songKey(song);

    const existingIndex =
        favorites.findIndex(
            item =>
                songKey(item) === key
        );


    if (existingIndex >= 0) {

        favorites.splice(
            existingIndex,
            1
        );

    } else {

        favorites.unshift(song);

    }


    writeStorage(
        STORAGE_KEYS.favorites,
        favorites
    );


    if (currentView === "favorites") {
        renderFavorites();
    }

}


/* =========================================================
   RECENTLY PLAYED
   ========================================================= */

function addRecentlyPlayed(song) {

    if (!song) {
        return;
    }

    let recent =
        getRecentlyPlayed();

    const key =
        songKey(song);

    recent =
        recent.filter(
            item =>
                songKey(item) !== key
        );

    recent.unshift(song);

    recent =
        recent.slice(0, 50);

    writeStorage(
        STORAGE_KEYS.recentlyPlayed,
        recent
    );

}


/* =========================================================
   FAVORITES VIEW
   ========================================================= */

function renderFavorites() {

    currentView =
        "favorites";

    currentPlaylistId = null;

    hideAllEmptyStates();

    const favorites =
        getFavorites()
            .filter(
                song =>
                    song.videoId
            );


    sectionLabel.textContent =
        "Your Music";

    sectionTitle.textContent =
        "Liked Songs";

    songCount.textContent =
        `${favorites.length} songs`;

    searchStatus.textContent = "";

    searchResults =
        favorites;


    if (!favorites.length) {

        musicGrid.innerHTML = "";

        emptyFavorites.classList.remove(
            "hidden"
        );

        return;

    }


    renderMusicCards(favorites);

}


/* =========================================================
   RECENT VIEW
   ========================================================= */

function renderRecent() {

    currentView =
        "recent";

    currentPlaylistId = null;

    hideAllEmptyStates();

    const recent =
        getRecentlyPlayed()
            .filter(
                song =>
                    song.videoId
            );


    sectionLabel.textContent =
        "History";

    sectionTitle.textContent =
        "Recently Played";

    songCount.textContent =
        `${recent.length} songs`;

    searchStatus.textContent = "";

    searchResults =
        recent;


    if (!recent.length) {

        musicGrid.innerHTML = "";

        emptyRecent.classList.remove(
            "hidden"
        );

        return;

    }


    renderMusicCards(recent);

}


/* =========================================================
   LIBRARY VIEW
   ========================================================= */

function renderLibrary() {

    currentView =
        "library";

    currentPlaylistId = null;

    hideAllEmptyStates();

    const favorites =
        getFavorites()
            .filter(
                song =>
                    song.videoId
            );

    const recent =
        getRecentlyPlayed()
            .filter(
                song =>
                    song.videoId
            );


    const combined =
        deduplicateSongs(
            [
                ...favorites,
                ...recent
            ]
        );


    sectionLabel.textContent =
        "Your Library";

    sectionTitle.textContent =
        "Your Music";

    songCount.textContent =
        `${combined.length} songs`;

    searchStatus.textContent = "";

    searchResults =
        combined;


    if (!combined.length) {

        musicGrid.innerHTML = "";

        emptyRecent.classList.remove(
            "hidden"
        );

        return;

    }


    renderMusicCards(combined);

}


/* =========================================================
   PLAYLISTS
   ========================================================= */

function createPlaylist(name) {

    const cleanName =
        name.trim();

    if (!cleanName) {
        return;
    }


    const playlists =
        getPlaylists();


    playlists.push({

        id: createId(),

        name: cleanName,

        songs: []

    });


    writeStorage(
        STORAGE_KEYS.playlists,
        playlists
    );


    renderSidebarPlaylists();

}


function deletePlaylist(id) {

    const playlists =
        getPlaylists()
            .filter(
                playlist =>
                    playlist.id !== id
            );


    writeStorage(
        STORAGE_KEYS.playlists,
        playlists
    );


    if (currentPlaylistId === id) {

        currentPlaylistId = null;

        renderHome();

    }


    renderSidebarPlaylists();

}


function getPlaylistById(id) {

    return getPlaylists()
        .find(
            playlist =>
                playlist.id === id
        );

}


function renderSidebarPlaylists() {

    sidebarPlaylists.innerHTML = "";

    const playlists =
        getPlaylists();


    if (!playlists.length) {

        sidebarPlaylists.innerHTML = `
            <div
                style="
                    color:#555;
                    font-size:11px;
                    padding:8px 11px;
                "
            >
                No playlists yet
            </div>
        `;

        return;

    }


    playlists.forEach(
        playlist => {

            const button =
                document.createElement("button");

            button.className =
                "sidebar-playlist-btn";

            if (
                currentPlaylistId === playlist.id
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.textContent =
                playlist.name;


            button.title =
                playlist.name;


            button.addEventListener(
                "click",
                () => {

                    renderPlaylist(
                        playlist.id
                    );

                }
            );


            sidebarPlaylists.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   PLAYLIST VIEW
   ========================================================= */

function renderPlaylist(id) {

    const playlist =
        getPlaylistById(id);

    if (!playlist) {
        return;
    }


    currentView =
        "playlist";

    currentPlaylistId =
        id;


    hideAllEmptyStates();


    const songs =
        playlist.songs
            .filter(
                song =>
                    song.videoId
            );


    sectionLabel.textContent =
        "Playlist";

    sectionTitle.textContent =
        playlist.name;

    songCount.textContent =
        `${songs.length} songs`;

    searchStatus.textContent = "";

    searchResults =
        songs;


    if (!songs.length) {

        musicGrid.innerHTML = "";

        emptyPlaylist.classList.remove(
            "hidden"
        );

        renderSidebarPlaylists();

        return;

    }


    renderMusicCards(songs);

    renderSidebarPlaylists();

}


/* =========================================================
   ADD SONG TO PLAYLIST
   ========================================================= */

function openAddToPlaylist(song) {

    currentAddPlaylistSong =
        song;

    renderPlaylistPicker();

    addPlaylistModal.classList.remove(
        "hidden"
    );

}


function closeAddToPlaylist() {

    currentAddPlaylistSong =
        null;

    addPlaylistModal.classList.add(
        "hidden"
    );

}


function renderPlaylistPicker() {

    playlistPicker.innerHTML = "";

    const playlists =
        getPlaylists();


    if (!playlists.length) {

        playlistPicker.innerHTML = `
            <div class="no-playlists">
                Create a playlist first.
            </div>
        `;

        return;

    }


    playlists.forEach(
        playlist => {

            const button =
                document.createElement("button");

            button.className =
                "playlist-picker-item";


            button.innerHTML = `

                <div class="playlist-picker-icon">
                    ♫
                </div>

                <div class="playlist-picker-info">

                    <strong>
                        ${escapeHTML(playlist.name)}
                    </strong>

                    <span>
                        ${playlist.songs.length} songs
                    </span>

                </div>

            `;


            button.addEventListener(
                "click",
                () => {

                    addSongToPlaylist(
                        playlist.id,
                        currentAddPlaylistSong
                    );

                }
            );


            playlistPicker.appendChild(
                button
            );

        }
    );

}


function addSongToPlaylist(
    playlistId,
    song
) {

    if (!song) {
        return;
    }


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


    const exists =
        playlist.songs.some(
            item =>
                songKey(item) === songKey(song)
        );


    if (!exists) {

        playlist.songs.push(song);

    }


    writeStorage(
        STORAGE_KEYS.playlists,
        playlists
    );


    closeAddToPlaylist();

    renderSidebarPlaylists();


    if (
        currentView === "playlist" &&
        currentPlaylistId === playlistId
    ) {

        renderPlaylist(
            playlistId
        );

    }

}


/* =========================================================
   YOUTUBE PLAYER
   ========================================================= */

window.onYouTubeIframeAPIReady =
    function () {

        youtubePlayer =
            new YT.Player(
                "youtubePlayer",
                {

                    width: "100%",

                    height: "100%",

                    playerVars: {

                        autoplay: 0,

                        controls: 1,

                        rel: 0,

                        modestbranding: 1,

                        playsinline: 1

                    },

                    events: {

                        onReady:
                            handleYouTubeReady,

                        onStateChange:
                            handleYouTubeStateChange,

                        onError:
                            handleYouTubeError

                    }

                }
            );

    };


function handleYouTubeReady(event) {

    youtubeReady = true;

    event.target.setVolume(
        Number(volumeSlider.value)
    );

    startProgressTimer();

}


/* =========================================================
   PLAY SONG
   ========================================================= */

function playSong(index) {

    if (
        index < 0 ||
        index >= searchResults.length
    ) {
        return;
    }


    const song =
        searchResults[index];


    if (!song?.videoId) {

        alert(
            "This saved song is not a YouTube song. Search for it again."
        );

        return;

    }


    currentSongIndex =
        index;

    currentSong =
        song;


    updatePlayer(song);

    addRecentlyPlayed(song);

    updateActiveCard();

    updateQueueCurrent();

    youtubePlayerWrapper.classList.add(
        "visible"
    );


    if (!youtubeReady || !youtubePlayer) {

        searchStatus.textContent =
            "YouTube player is still loading...";

        return;

    }


    youtubePlayer.loadVideoById(
        song.videoId
    );


    youtubePlayer.setVolume(
        Number(volumeSlider.value)
    );


    renderQueue();

}


/* =========================================================
   PLAYER UI
   ========================================================= */

function updatePlayer(song) {

    playerTitle.textContent =
        song.title;

    playerArtist.textContent =
        song.artist;


    playerCover.innerHTML = `
        <img
            src="${escapeHTML(song.artwork)}"
            alt=""
        >
    `;


    updatePlayButton();

}


function setCover(element, song) {

    if (!song) {

        element.innerHTML =
            "<span>♫</span>";

        return;

    }


    element.innerHTML = `
        <img
            src="${escapeHTML(song.artwork)}"
            alt=""
        >
    `;

}


function updatePlayButton() {

    if (
        youtubePlayer &&
        youtubeReady
    ) {

        const state =
            youtubePlayer.getPlayerState();

        if (
            state === YT.PlayerState.PLAYING
        ) {

            playPauseButton.textContent =
                "❚❚";

            return;

        }

    }


    playPauseButton.textContent =
        "▶";

}


function updateActiveCard() {

    document
        .querySelectorAll(".music-card")
        .forEach(
            card => {

                const index =
                    Number(
                        card.dataset.index
                    );

                const song =
                    searchResults[index];


                card.classList.toggle(
                    "active",
                    Boolean(
                        currentSong &&
                        song &&
                        song.videoId ===
                            currentSong.videoId
                    )
                );

            }
        );

}


/* =========================================================
   PLAY / PAUSE
   ========================================================= */

function togglePlayPause() {

    if (
        !youtubePlayer ||
        !youtubeReady
    ) {

        if (searchResults.length) {

            playSong(
                currentSongIndex >= 0
                    ? currentSongIndex
                    : 0
            );

        }

        return;

    }


    if (!currentSong) {

        if (searchResults.length) {

            playSong(0);

        }

        return;

    }


    const state =
        youtubePlayer.getPlayerState();


    if (
        state === YT.PlayerState.PLAYING
    ) {

        youtubePlayer.pauseVideo();

    } else {

        youtubePlayer.playVideo();

    }

}


/* =========================================================
   YOUTUBE STATE
   ========================================================= */

function handleYouTubeStateChange(event) {

    updatePlayButton();


    if (
        event.data ===
        YT.PlayerState.PLAYING
    ) {

        updatePlayButton();

        startProgressTimer();

    }


    if (
        event.data ===
        YT.PlayerState.PAUSED
    ) {

        updatePlayButton();

    }


    if (
        event.data ===
        YT.PlayerState.ENDED
    ) {

        handleSongEnded();

    }

}


function handleYouTubeError(event) {

    console.error(
        "YouTube player error:",
        event.data
    );


    searchStatus.textContent =
        "This YouTube video cannot be played here. Trying the next song...";


    setTimeout(
        () => {

            nextSong();

        },
        1200
    );

}


/* =========================================================
   SONG ENDED
   ========================================================= */

function handleSongEnded() {

    if (repeatMode === 2) {

        youtubePlayer.seekTo(
            0,
            true
        );

        youtubePlayer.playVideo();

        return;

    }


    nextSong();

}


/* =========================================================
   NEXT SONG
   ========================================================= */

function nextSong() {

    if (!searchResults.length) {
        return;
    }


    let nextIndex;


    if (shuffleEnabled) {

        if (searchResults.length === 1) {

            nextIndex = 0;

        } else {

            do {

                nextIndex =
                    Math.floor(
                        Math.random() *
                        searchResults.length
                    );

            } while (
                nextIndex ===
                currentSongIndex
            );

        }

    } else {

        nextIndex =
            currentSongIndex + 1;

    }


    if (
        nextIndex >=
        searchResults.length
    ) {

        if (repeatMode === 1) {

            nextIndex = 0;

        } else {

            nextIndex = 0;

        }

    }


    playSong(nextIndex);

}


/* =========================================================
   PREVIOUS
   ========================================================= */

function previousSong() {

    if (!searchResults.length) {
        return;
    }


    if (
        youtubePlayer &&
        youtubeReady
    ) {

        const time =
            youtubePlayer.getCurrentTime();


        if (time > 3) {

            youtubePlayer.seekTo(
                0,
                true
            );

            return;

        }

    }


    let previousIndex =
        currentSongIndex - 1;


    if (previousIndex < 0) {

        previousIndex =
            searchResults.length - 1;

    }


    playSong(previousIndex);

}


/* =========================================================
   SHUFFLE
   ========================================================= */

function toggleShuffle() {

    shuffleEnabled =
        !shuffleEnabled;

    shuffleButton.classList.toggle(
        "active",
        shuffleEnabled
    );

}


/* =========================================================
   REPEAT
   ========================================================= */

function toggleRepeat() {

    repeatMode++;

    if (repeatMode > 2) {
        repeatMode = 0;
    }


    repeatButton.classList.toggle(
        "active",
        repeatMode !== 0
    );


    if (repeatMode === 0) {

        repeatButton.title =
            "Repeat off";

    } else if (repeatMode === 1) {

        repeatButton.title =
            "Repeat all";

    } else {

        repeatButton.title =
            "Repeat one";

    }

}


/* =========================================================
   PROGRESS
   ========================================================= */

function startProgressTimer() {

    if (progressTimer) {
        return;
    }


    progressTimer =
        setInterval(
            updateProgress,
            500
        );

}


function updateProgress() {

    if (
        !youtubePlayer ||
        !youtubeReady
    ) {
        return;
    }


    let current = 0;

    let duration = 0;


    try {

        current =
            youtubePlayer.getCurrentTime();

        duration =
            youtubePlayer.getDuration();

    } catch (_) {

        return;

    }


    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {

        progressBar.value = 0;

        currentTimeElement.textContent =
            formatTime(current);

        durationElement.textContent =
            "0:00";

        return;

    }


    const percent =
        (current / duration) * 100;


    progressBar.value =
        percent;

    currentTimeElement.textContent =
        formatTime(current);

    durationElement.textContent =
        formatTime(duration);

}


function seekFromProgress() {

    if (
        !youtubePlayer ||
        !youtubeReady
    ) {
        return;
    }


    const duration =
        youtubePlayer.getDuration();


    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        return;
    }


    const percentage =
        Number(progressBar.value) / 100;


    youtubePlayer.seekTo(
        duration * percentage,
        true
    );

}


/* =========================================================
   VOLUME
   ========================================================= */

function updateVolume() {

    if (
        !youtubePlayer ||
        !youtubeReady
    ) {
        return;
    }


    const volume =
        Number(volumeSlider.value);


    youtubePlayer.setVolume(
        volume
    );


    if (volume === 0) {

        volumeIcon.textContent =
            "🔇";

    } else if (volume < 50) {

        volumeIcon.textContent =
            "🔉";

    } else {

        volumeIcon.textContent =
            "🔊";

    }

}


/* =========================================================
   QUEUE
   ========================================================= */

function openQueue() {

    queuePanel.classList.add(
        "open"
    );

    queueOverlay.classList.add(
        "open"
    );

    renderQueue();

}


function closeQueue() {

    queuePanel.classList.remove(
        "open"
    );

    queueOverlay.classList.remove(
        "open"
    );

}


function updateQueueCurrent() {

    if (!currentSong) {

        queueCurrentTitle.textContent =
            "Nothing playing";

        queueCurrentArtist.textContent =
            "RedWave";

        setCover(
            queueCurrentCover,
            null
        );

        return;

    }


    queueCurrentTitle.textContent =
        currentSong.title;

    queueCurrentArtist.textContent =
        currentSong.artist;

    setCover(
        queueCurrentCover,
        currentSong
    );

}


function renderQueue() {

    queueList.innerHTML = "";


    if (!searchResults.length) {

        queueList.innerHTML = `
            <div class="queue-empty">
                Your queue is empty.
            </div>
        `;

        return;

    }


    const songsToShow =
        searchResults
            .map(
                (song, index) => ({
                    song,
                    index
                })
            )
            .filter(
                item =>
                    item.index !==
                    currentSongIndex
            );


    if (!songsToShow.length) {

        queueList.innerHTML = `
            <div class="queue-empty">
                No more songs in the queue.
            </div>
        `;

        return;

    }


    songsToShow.forEach(
        item => {

            const { song, index } =
                item;


            const queueItem =
                document.createElement("div");

            queueItem.className =
                "queue-item";


            queueItem.innerHTML = `

                <div class="queue-item-cover">

                    <img
                        src="${escapeHTML(song.artwork)}"
                        alt=""
                        loading="lazy"
                    >

                </div>

                <div class="queue-item-info">

                    <div class="queue-item-title">
                        ${escapeHTML(song.title)}
                    </div>

                    <div class="queue-item-artist">
                        ${escapeHTML(song.artist)}
                    </div>

                </div>

            `;


            queueItem.addEventListener(
                "click",
                () => {

                    playSong(index);

                }
            );


            queueList.appendChild(
                queueItem
            );

        }
    );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setActiveNav(view) {

    document
        .querySelectorAll(".nav-btn[data-view]")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.view === view
                );

            }
        );

}


function handleNavigation(view) {

    setActiveNav(view);


    if (view === "home") {

        currentView = "home";

        currentPlaylistId = null;

        searchInput.value = "";

        clearSearchButton.classList.remove(
            "visible"
        );

        renderHome();

        return;

    }


    if (view === "search") {

        currentView = "search";

        searchInput.focus();

        return;

    }


    if (view === "favorites") {

        renderFavorites();

        return;

    }


    if (view === "recent") {

        renderRecent();

        return;

    }


    if (view === "library") {

        renderLibrary();

        return;

    }

}


/* =========================================================
   SEARCH INPUT
   ========================================================= */

function handleSearchInput() {

    const query =
        searchInput.value.trim();


    clearSearchButton.classList.toggle(
        "visible",
        Boolean(query)
    );


    if (!query) {

        if (searchController) {
            searchController.abort();
        }

        searchResults = [];

        currentView = "home";

        renderHome();

        return;

    }


    currentView = "search";

    currentPlaylistId = null;

    setActiveNav("search");


    clearTimeout(searchTimer);


    searchTimer =
        setTimeout(
            () => {

                searchYouTube(query);

            },
            400
        );

}


function clearSearch() {

    searchInput.value = "";

    clearSearchButton.classList.remove(
        "visible"
    );


    if (searchController) {
        searchController.abort();
    }


    searchResults = [];

    currentView = "home";

    setActiveNav("home");

    renderHome();

}


/* =========================================================
   CREATE PLAYLIST MODAL
   ========================================================= */

function openPlaylistModal() {

    playlistNameInput.value = "";

    playlistModal.classList.remove(
        "hidden"
    );

    setTimeout(
        () => {
            playlistNameInput.focus();
        },
        50
    );

}


function closePlaylistModalWindow() {

    playlistModal.classList.add(
        "hidden"
    );

}


function savePlaylist() {

    const name =
        playlistNameInput.value.trim();


    if (!name) {

        playlistNameInput.focus();

        return;

    }


    createPlaylist(name);

    closePlaylistModalWindow();

}


/* =========================================================
   SPOTIFY IMPORT HELPER
   ========================================================= */

function openSpotifyModal() {

    spotifyPlaylistInput.value = "";

    spotifyImportResult.innerHTML = "";

    spotifyImportModal.classList.remove(
        "hidden"
    );

}


function closeSpotifyModal() {

    spotifyImportModal.classList.add(
        "hidden"
    );

}


function checkSpotifyLink() {

    const value =
        spotifyPlaylistInput.value.trim();


    if (!value) {

        spotifyImportResult.innerHTML = `
            <div class="spotify-error">
                Paste a Spotify playlist link first.
            </div>
        `;

        return;

    }


    const match =
        value.match(
            /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/
        );


    if (!match) {

        spotifyImportResult.innerHTML = `
            <div class="spotify-error">
                That doesn't look like a Spotify playlist link.
            </div>
        `;

        return;

    }


    const playlistId =
        match[1];


    spotifyImportResult.innerHTML = `

        <div class="spotify-detected">

            <div class="spotify-detected-icon">
                ♫
            </div>

            <div class="spotify-detected-info">

                <strong>
                    Spotify playlist detected
                </strong>

                <span>
                    Playlist ID: ${escapeHTML(playlistId)}
                    <br>
                    Full automatic song importing will be connected in the next backend/API stage.
                </span>

            </div>

        </div>

    `;

}


/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const target =
            event.target;


        const typing =
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA";


        if (
            event.code === "Space" &&
            !typing
        ) {

            event.preventDefault();

            togglePlayPause();

        }


        if (
            event.key.toLowerCase() === "m" &&
            !typing
        ) {

            if (
                youtubePlayer &&
                youtubeReady
            ) {

                if (
                    youtubePlayer.isMuted()
                ) {

                    youtubePlayer.unMute();

                    volumeIcon.textContent =
                        "🔊";

                } else {

                    youtubePlayer.mute();

                    volumeIcon.textContent =
                        "🔇";

                }

            }

        }


        if (
            event.key.toLowerCase() === "s" &&
            !typing
        ) {

            toggleShuffle();

        }


        if (
            event.key.toLowerCase() === "r" &&
            !typing
        ) {

            toggleRepeat();

        }


        if (
            event.key === "ArrowRight" &&
            !typing
        ) {

            nextSong();

        }


        if (
            event.key === "ArrowLeft" &&
            !typing
        ) {

            previousSong();

        }

    }
);


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

searchInput.addEventListener(
    "input",
    handleSearchInput
);


clearSearchButton.addEventListener(
    "click",
    clearSearch
);


startListeningButton.addEventListener(
    "click",
    () => {

        searchInput.focus();

    }
);


playPauseButton.addEventListener(
    "click",
    togglePlayPause
);


previousButton.addEventListener(
    "click",
    previousSong
);


nextButton.addEventListener(
    "click",
    nextSong
);


shuffleButton.addEventListener(
    "click",
    toggleShuffle
);


repeatButton.addEventListener(
    "click",
    toggleRepeat
);


progressBar.addEventListener(
    "input",
    seekFromProgress
);


volumeSlider.addEventListener(
    "input",
    updateVolume
);


/* QUEUE */

queueButton.addEventListener(
    "click",
    openQueue
);


closeQueueButton.addEventListener(
    "click",
    closeQueue
);


queueOverlay.addEventListener(
    "click",
    closeQueue
);


/* PLAYLIST */

createPlaylistButton.addEventListener(
    "click",
    openPlaylistModal
);


closePlaylistModal.addEventListener(
    "click",
    closePlaylistModalWindow
);


cancelPlaylistButton.addEventListener(
    "click",
    closePlaylistModalWindow
);


savePlaylistButton.addEventListener(
    "click",
    savePlaylist
);


playlistNameInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            savePlaylist();

        }

    }
);


/* ADD PLAYLIST */

closeAddPlaylistModal.addEventListener(
    "click",
    closeAddToPlaylist
);


/* SPOTIFY */

openSpotifyImport.addEventListener(
    "click",
    openSpotifyModal
);


closeSpotifyImport.addEventListener(
    "click",
    closeSpotifyModal
);


cancelSpotifyImport.addEventListener(
    "click",
    closeSpotifyModal
);


checkSpotifyPlaylist.addEventListener(
    "click",
    checkSpotifyLink
);


spotifyPlaylistInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            checkSpotifyLink();

        }

    }
);


/* NAV */

document
    .querySelectorAll(".nav-btn[data-view]")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    handleNavigation(
                        button.dataset.view
                    );

                }
            );

        }
    );


/* =========================================================
   MODAL BACKDROP CLOSE
   ========================================================= */

[
    playlistModal,
    addPlaylistModal,
    spotifyImportModal
].forEach(
    modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    modal.classList.add(
                        "hidden"
                    );

                }

            }
        );

    }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {

    renderSidebarPlaylists();

    renderHome();

    shuffleButton.classList.remove(
        "active"
    );

    repeatButton.classList.remove(
        "active"
    );


    console.log(
        "RedWave + YouTube Music System Ready"
    );

}


initialize();
