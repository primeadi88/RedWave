"use strict";

/* =========================================================
   REDWAVE
   YouTube Music Player
   ========================================================= */

/* =========================================================
   CONFIGURATION
   ========================================================= */

const YOUTUBE_API_KEY = "AIzaSyDwK6p9mcWbkS446vAfwOp8X2iefo0rk80";

const YOUTUBE_SEARCH_API =
    "https://www.googleapis.com/youtube/v3/search";

/* =========================================================
   APPLICATION STATE
   ========================================================= */

let youtubePlayer = null;
let youtubePlayerReady = false;

let pendingVideoId = null;
let pendingPlayRequest = false;

let currentSong = null;

let searchResults = [];
let currentResults = [];

let queue = [];
let queueIndex = -1;

let isPlaying = false;

let shuffleEnabled = false;
let repeatMode = false;

let currentView = "home";

let searchTimer = null;

let selectedSongForPlaylist = null;

let previousVolume = 100;

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

const STORAGE_KEYS = {
    favorites: "redwave_favorites",
    recent: "redwave_recent",
    playlists: "redwave_playlists"
};

function loadStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        const parsed = JSON.parse(value);

        return parsed ?? fallback;
    } catch (error) {
        console.error(
            "RedWave: Could not load local storage:",
            error
        );

        return fallback;
    }
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    } catch (error) {
        console.error(
            "RedWave: Could not save local storage:",
            error
        );
    }
}

let favorites = loadStorage(
    STORAGE_KEYS.favorites,
    []
);

let recentSongs = loadStorage(
    STORAGE_KEYS.recent,
    []
);

let playlists = loadStorage(
    STORAGE_KEYS.playlists,
    []
);

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

let searchInput;
let clearSearchButton;
let searchWrapper;

let queueButton;
let queueOverlay;
let queuePanel;
let closeQueueButton;
let queueCurrentCover;
let queueCurrentTitle;
let queueCurrentArtist;
let queueList;

let playerCover;
let playerTitle;
let playerArtist;
let shuffleButton;
let previousButton;
let playPauseButton;
let nextButton;
let repeatButton;
let progressBar;
let currentTimeElement;
let durationElement;
let volumeSlider;
let volumeIcon;

let musicGrid;
let sectionLabel;
let sectionTitle;
let songCount;
let searchStatus;
let noResults;
let emptyFavorites;
let emptyRecent;
let emptyPlaylist;
let homeHero;
let startListeningButton;

let sidebarPlaylists;
let createPlaylistButton;

let playlistModal;
let closePlaylistModalButton;
let playlistNameInput;
let cancelPlaylistButton;
let savePlaylistButton;

let addPlaylistModal;
let closeAddPlaylistModalButton;
let playlistPicker;

let spotifyImportModal;
let openSpotifyImport;
let closeSpotifyImportButton;
let spotifyPlaylistInput;
let spotifyImportResult;
let cancelSpotifyImport;
let checkSpotifyPlaylistButton;

let youtubePlayerElement;
let youtubePlayerWrapper;

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeRedWave
);

function initializeRedWave() {
    cacheDOMElements();

    setupNavigation();

    setupSearch();

    setupQueue();

    setupPlayerControls();

    setupPlaylistControls();

    setupSpotifyImport();

    setupStartListening();

    renderPlaylists();

    resetEmptyStates();

    updateSearchClearButton();

    updatePlayerUI();

    updateVolumeIcon(
        Number(
            volumeSlider
                ? volumeSlider.value
                : 100
        )
    );

    console.log(
        "RedWave initialized successfully."
    );

    /*
        If the YouTube API is already ready,
        create the player immediately.
    */
    if (
        typeof YT !== "undefined" &&
        YT.Player
    ) {
        createYouTubePlayer();
    }
}

/* =========================================================
   CACHE DOM
   ========================================================= */

function cacheDOMElements() {
    searchInput =
        document.getElementById("searchInput");

    clearSearchButton =
        document.getElementById("clearSearchButton");

    searchWrapper =
        document.querySelector(".search-wrapper");

    queueButton =
        document.getElementById("queueButton");

    queueOverlay =
        document.getElementById("queueOverlay");

    queuePanel =
        document.getElementById("queuePanel");

    closeQueueButton =
        document.getElementById("closeQueueButton");

    queueCurrentCover =
        document.getElementById("queueCurrentCover");

    queueCurrentTitle =
        document.getElementById("queueCurrentTitle");

    queueCurrentArtist =
        document.getElementById("queueCurrentArtist");

    queueList =
        document.getElementById("queueList");

    playerCover =
        document.getElementById("playerCover");

    playerTitle =
        document.getElementById("playerTitle");

    playerArtist =
        document.getElementById("playerArtist");

    shuffleButton =
        document.getElementById("shuffleButton");

    previousButton =
        document.getElementById("previousButton");

    playPauseButton =
        document.getElementById("playPauseButton");

    nextButton =
        document.getElementById("nextButton");

    repeatButton =
        document.getElementById("repeatButton");

    progressBar =
        document.getElementById("progressBar");

    currentTimeElement =
        document.getElementById("currentTime");

    durationElement =
        document.getElementById("duration");

    volumeSlider =
        document.getElementById("volumeSlider");

    volumeIcon =
        document.getElementById("volumeIcon");

    musicGrid =
        document.getElementById("musicGrid");

    sectionLabel =
        document.getElementById("sectionLabel");

    sectionTitle =
        document.getElementById("sectionTitle");

    songCount =
        document.getElementById("songCount");

    searchStatus =
        document.getElementById("searchStatus");

    noResults =
        document.getElementById("noResults");

    emptyFavorites =
        document.getElementById("emptyFavorites");

    emptyRecent =
        document.getElementById("emptyRecent");

    emptyPlaylist =
        document.getElementById("emptyPlaylist");

    homeHero =
        document.getElementById("homeHero");

    startListeningButton =
        document.getElementById("startListeningButton");

    sidebarPlaylists =
        document.getElementById("sidebarPlaylists");

    createPlaylistButton =
        document.getElementById("createPlaylistButton");

    playlistModal =
        document.getElementById("playlistModal");

    closePlaylistModalButton =
        document.getElementById("closePlaylistModal");

    playlistNameInput =
        document.getElementById("playlistNameInput");

    cancelPlaylistButton =
        document.getElementById("cancelPlaylistButton");

    savePlaylistButton =
        document.getElementById("savePlaylistButton");

    addPlaylistModal =
        document.getElementById("addPlaylistModal");

    closeAddPlaylistModalButton =
        document.getElementById("closeAddPlaylistModal");

    playlistPicker =
        document.getElementById("playlistPicker");

    spotifyImportModal =
        document.getElementById("spotifyImportModal");

    openSpotifyImport =
        document.getElementById("openSpotifyImport");

    closeSpotifyImportButton =
        document.getElementById("closeSpotifyImport");

    spotifyPlaylistInput =
        document.getElementById("spotifyPlaylistInput");

    spotifyImportResult =
        document.getElementById("spotifyImportResult");

    cancelSpotifyImport =
        document.getElementById("cancelSpotifyImport");

    checkSpotifyPlaylistButton =
        document.getElementById("checkSpotifyPlaylist");

    youtubePlayerElement =
        document.getElementById("youtubePlayer");

    youtubePlayerWrapper =
        document.querySelector(
            ".youtube-player-wrapper"
        );
}

/* =========================================================
   YOUTUBE IFRAME API
   ========================================================= */

window.onYouTubeIframeAPIReady = function () {
    console.log(
        "RedWave: YouTube IFrame API is ready."
    );

    createYouTubePlayer();
};

function createYouTubePlayer() {
    if (!youtubePlayerElement) {
        console.error(
            "RedWave: #youtubePlayer was not found."
        );

        return;
    }

    if (
        typeof YT === "undefined" ||
        !YT.Player
    ) {
        console.warn(
            "RedWave: YouTube API is not ready yet."
        );

        return;
    }

    if (youtubePlayer) {
        return;
    }

    try {
        youtubePlayer =
            new YT.Player(
                "youtubePlayer",
                {
                    width: "300",
                    height: "169",

                    playerVars: {
                        autoplay: 0,
                        controls: 1,
                        playsinline: 1,
                        rel: 0,
                        modestbranding: 1,
                        enablejsapi: 1,
                        origin: window.location.origin
                    },

                    events: {
                        onReady:
                            onYouTubePlayerReady,

                        onStateChange:
                            onYouTubePlayerStateChange,

                        onError:
                            onYouTubePlayerError,

                        onAutoplayBlocked:
                            onYouTubeAutoplayBlocked
                    }
                }
            );
    } catch (error) {
        console.error(
            "RedWave: Failed to create YouTube player:",
            error
        );
    }
}

/* =========================================================
   YOUTUBE PLAYER EVENTS
   ========================================================= */

function onYouTubePlayerReady(event) {
    youtubePlayerReady = true;

    console.log(
        "RedWave: YouTube player is ready."
    );

    const initialVolume =
        Number(
            volumeSlider
                ? volumeSlider.value
                : 100
        );

    try {
        event.target.setVolume(
            initialVolume
        );
    } catch (error) {
        console.warn(
            "RedWave: Could not set initial volume.",
            error
        );
    }

    /*
        If the user clicked a song before the
        YouTube player finished loading, play it now.
    */
    if (
        pendingVideoId &&
        pendingPlayRequest
    ) {
        const videoId =
            pendingVideoId;

        pendingVideoId = null;
        pendingPlayRequest = false;

        loadYouTubeVideo(
            videoId
        );
    }
}

function onYouTubePlayerStateChange(event) {
    if (
        typeof YT === "undefined"
    ) {
        return;
    }

    switch (event.data) {
        case YT.PlayerState.PLAYING:

            isPlaying = true;

            updatePlayButton();

            break;

        case YT.PlayerState.PAUSED:

            isPlaying = false;

            updatePlayButton();

            break;

        case YT.PlayerState.ENDED:

            isPlaying = false;

            updatePlayButton();

            handleSongEnded();

            break;

        case YT.PlayerState.BUFFERING:

            updatePlayButton();

            break;

        default:
            break;
    }
}

function onYouTubePlayerError(event) {
    console.error(
        "RedWave: YouTube player error code:",
        event.data
    );

    let message =
        "YouTube could not play this video.";

    switch (event.data) {
        case 2:

            message =
                "Invalid YouTube video ID.";

            break;

        case 5:

            message =
                "YouTube player error.";

            break;

        case 100:

            message =
                "This YouTube video is unavailable.";

            break;

        case 101:
        case 150:

            message =
                "This video does not allow embedded playback.";

            break;

        case 153:

            message =
                "YouTube could not identify the embedded player.";

            break;

        default:
            break;
    }

    isPlaying = false;

    updatePlayButton();

    showSearchStatus(
        message
    );
}

function onYouTubeAutoplayBlocked() {
    console.warn(
        "RedWave: YouTube autoplay was blocked."
    );

    isPlaying = false;

    updatePlayButton();

    showSearchStatus(
        "YouTube blocked automatic playback. Press Play to continue."
    );
}

/* =========================================================
   PLAY YOUTUBE VIDEO
   ========================================================= */

function playYouTubeVideo(videoId) {
    if (!videoId) {
        return;
    }

    showYouTubePlayer();

    /*
        If the player is not ready yet,
        remember the requested video.
    */
    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        pendingVideoId =
            videoId;

        pendingPlayRequest =
            true;

        console.log(
            "RedWave: Waiting for YouTube player..."
        );

        return;
    }

    /*
        The player is already ready.
        Load the video immediately.
    */
    loadYouTubeVideo(
        videoId
    );
}

function loadYouTubeVideo(videoId) {
    if (
        !videoId ||
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }

    try {
        console.log(
            "RedWave: Loading YouTube video:",
            videoId
        );

        youtubePlayer.loadVideoById(
            videoId
        );

        pendingVideoId = null;
        pendingPlayRequest = false;

        /*
            Do not set isPlaying here.
            Wait for YouTube's PLAYING event.
        */
        isPlaying = false;

        updatePlayButton();
    } catch (error) {
        console.error(
            "RedWave: Could not load YouTube video:",
            error
        );

        isPlaying = false;

        updatePlayButton();

        showSearchStatus(
            "Could not start this YouTube video."
        );
    }
}

function showYouTubePlayer() {
    if (!youtubePlayerWrapper) {
        return;
    }

    youtubePlayerWrapper.classList.add(
        "visible"
    );
}

function hideYouTubePlayer() {
    if (!youtubePlayerWrapper) {
        return;
    }

    youtubePlayerWrapper.classList.remove(
        "visible"
    );
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {
    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        function () {
            const query =
                searchInput.value.trim();

            updateSearchClearButton();

            clearTimeout(
                searchTimer
            );

            if (!query) {
                searchResults = [];
                currentResults = [];

                showHomeView();

                return;
            }

            currentView =
                "search";

            showSearchView();

            searchTimer =
                setTimeout(
                    function () {
                        searchYouTube(
                            query
                        );
                    },
                    350
                );
        }
    );

    searchInput.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Enter"
            ) {
                event.preventDefault();

                const query =
                    searchInput.value.trim();

                if (!query) {
                    return;
                }

                clearTimeout(
                    searchTimer
                );

                searchYouTube(
                    query
                );
            }
        }
    );

    if (clearSearchButton) {
        clearSearchButton.addEventListener(
            "click",
            function () {
                searchInput.value = "";

                updateSearchClearButton();

                searchResults = [];

                currentResults = [];

                showHomeView();

                searchInput.focus();
            }
        );
    }
}

async function searchYouTube(query) {
    if (!query) {
        return;
    }

    if (
        !YOUTUBE_API_KEY ||
        YOUTUBE_API_KEY ===
        "PASTE_YOUR_YOUTUBE_API_KEY_HERE"
    ) {
        showSearchStatus(
            "Add your YouTube Data API key at the top of script.js."
        );

        return;
    }

    currentView =
        "search";

    showSearchView();

    if (sectionLabel) {
        sectionLabel.textContent =
            "SEARCH RESULTS";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            'Results for "' +
            query +
            '"';
    }

    if (songCount) {
        songCount.textContent = "";
    }

    showSearchStatus(
        "Searching YouTube..."
    );

    if (musicGrid) {
        musicGrid.innerHTML =
            '<div class="loading">Finding music</div>';
    }

    hideAllEmptyStates();

    try {
        const url =
            new URL(
                YOUTUBE_SEARCH_API
            );

        url.searchParams.set(
            "part",
            "snippet"
        );

        url.searchParams.set(
            "q",
            query
        );

        url.searchParams.set(
            "type",
            "video"
        );

        url.searchParams.set(
            "videoCategoryId",
            "10"
        );

        url.searchParams.set(
            "maxResults",
            "24"
        );

        url.searchParams.set(
            "key",
            YOUTUBE_API_KEY
        );

        const response =
            await fetch(
                url.toString()
            );

        const data =
            await response.json();

        if (!response.ok) {
            console.error(
                "RedWave: YouTube API error:",
                data
            );

            throw new Error(
                data &&
                data.error &&
                data.error.message
                    ? data.error.message
                    : "YouTube API request failed."
            );
        }

        const results =
            Array.isArray(data.items)
                ? data.items
                : [];

        searchResults =
            results
                .filter(
                    function (item) {
                        return (
                            item &&
                            item.id &&
                            item.id.videoId
                        );
                    }
                )
                .map(
                    normalizeYouTubeResult
                );

        currentResults =
            searchResults.slice();

        if (
            currentResults.length === 0
        ) {
            if (musicGrid) {
                musicGrid.innerHTML = "";
            }

            if (songCount) {
                songCount.textContent =
                    "0 results";
            }

            showSearchStatus(
                "No YouTube results found."
            );

            noResults?.classList.remove(
                "hidden"
            );

            return;
        }

        if (songCount) {
            songCount.textContent =
                currentResults.length +
                " results";
        }

        showSearchStatus(
            'Showing YouTube results for "' +
            query +
            '"'
        );

        renderSongs(
            currentResults
        );
    } catch (error) {
        console.error(
            "RedWave search error:",
            error
        );

        if (musicGrid) {
            musicGrid.innerHTML = "";
        }

        if (songCount) {
            songCount.textContent = "";
        }

        showSearchStatus(
            "Search error: " +
            error.message
        );

        noResults?.classList.add(
            "hidden"
        );
    }
}

/* =========================================================
   NORMALIZE YOUTUBE RESULT
   ========================================================= */

function normalizeYouTubeResult(item) {
    const videoId =
        item.id.videoId;

    const title =
        cleanYouTubeText(
            item.snippet?.title ||
            "Unknown title"
        );

    const channelTitle =
        cleanYouTubeText(
            item.snippet?.channelTitle ||
            "YouTube"
        );

    const thumbnails =
        item.snippet?.thumbnails || {};

    const thumbnail =
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        "https://i.ytimg.com/vi/" +
        videoId +
        "/hqdefault.jpg";

    return {
        id: videoId,
        videoId: videoId,
        title: title,
        artist: channelTitle,
        cover: thumbnail,
        thumbnail: thumbnail
    };
}

function cleanYouTubeText(text) {
    const element =
        document.createElement(
            "textarea"
        );

    element.innerHTML =
        String(text);

    return element.value;
}

/* =========================================================
   RENDER SONGS
   ========================================================= */

function renderSongs(songs) {
    if (!musicGrid) {
        return;
    }

    musicGrid.innerHTML = "";

    hideAllEmptyStates();

    if (
        !Array.isArray(songs) ||
        songs.length === 0
    ) {
        return;
    }

    songs.forEach(
        function (song, index) {
            const card =
                createSongCard(
                    song,
                    index,
                    songs
                );

            musicGrid.appendChild(
                card
            );
        }
    );
}

function createSongCard(
    song,
    index,
    songList
) {
    const card =
        document.createElement(
            "article"
        );

    card.className =
        "song-card";

    const cover =
        document.createElement(
            "div"
        );

    cover.className =
        "song-cover";

    const image =
        document.createElement(
            "img"
        );

    image.src =
        song.cover;

    image.alt =
        song.title;

    image.loading =
        index < 6
            ? "eager"
            : "lazy";

    image.onerror =
        function () {
            image.src =
                "https://i.ytimg.com/vi/" +
                song.videoId +
                "/hqdefault.jpg";
        };

    const playOverlay =
        document.createElement(
            "div"
        );

    playOverlay.className =
        "song-play-overlay";

    playOverlay.textContent =
        "▶";

    cover.appendChild(
        image
    );

    cover.appendChild(
        playOverlay
    );

    const title =
        document.createElement(
            "div"
        );

    title.className =
        "song-title";

    title.textContent =
        song.title;

    const artist =
        document.createElement(
            "div"
        );

    artist.className =
        "song-artist";

    artist.textContent =
        song.artist;

    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "song-actions";

    const likeButton =
        document.createElement(
            "button"
        );

    likeButton.className =
        "song-action-button";

    likeButton.type =
        "button";

    likeButton.textContent =
        isFavorite(song)
            ? "♥ Liked"
            : "♥ Like";

    const playlistButton =
        document.createElement(
            "button"
        );

    playlistButton.className =
        "song-action-button";

    playlistButton.type =
        "button";

    playlistButton.textContent =
        "+ Playlist";

    actions.appendChild(
        likeButton
    );

    actions.appendChild(
        playlistButton
    );

    card.appendChild(
        cover
    );

    card.appendChild(
        title
    );

    card.appendChild(
        artist
    );

    card.appendChild(
        actions
    );

    cover.addEventListener(
        "click",
        function () {
            playSong(
                song,
                songList,
                index
            );
        }
    );

    title.addEventListener(
        "click",
        function () {
            playSong(
                song,
                songList,
                index
            );
        }
    );

    artist.addEventListener(
        "click",
        function () {
            playSong(
                song,
                songList,
                index
            );
        }
    );

    likeButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();

            toggleFavorite(
                song
            );

            likeButton.textContent =
                isFavorite(song)
                    ? "♥ Liked"
                    : "♥ Like";
        }
    );

    playlistButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();

            openAddToPlaylistModal(
                song
            );
        }
    );

    return card;
}

/* =========================================================
   PLAY SONG
   ========================================================= */

function playSong(
    song,
    sourceList,
    index
) {
    if (!song || !song.videoId) {
        return;
    }

    currentSong =
        song;

    queue =
        Array.isArray(sourceList)
            ? sourceList.slice()
            : [song];

    queueIndex =
        Number.isInteger(index)
            ? index
            : 0;

    if (
        queueIndex < 0 ||
        queueIndex >= queue.length
    ) {
        queueIndex = 0;
    }

    addToRecent(
        song
    );

    updatePlayerUI();

    updateQueueUI();

    playYouTubeVideo(
        song.videoId
    );
}

/* =========================================================
   RECENT
   ========================================================= */

function addToRecent(song) {
    if (!song) {
        return;
    }

    recentSongs =
        recentSongs.filter(
            function (item) {
                return (
                    item.videoId !==
                    song.videoId
                );
            }
        );

    recentSongs.unshift(
        song
    );

    recentSongs =
        recentSongs.slice(
            0,
            50
        );

    saveStorage(
        STORAGE_KEYS.recent,
        recentSongs
    );
}

/* =========================================================
   FAVORITES
   ========================================================= */

function isFavorite(song) {
    if (!song || !song.videoId) {
        return false;
    }

    return favorites.some(
        function (item) {
            return (
                item.videoId ===
                song.videoId
            );
        }
    );
}

function toggleFavorite(song) {
    if (!song || !song.videoId) {
        return;
    }

    if (isFavorite(song)) {
        favorites =
            favorites.filter(
                function (item) {
                    return (
                        item.videoId !==
                        song.videoId
                    );
                }
            );
    } else {
        favorites.unshift(
            song
        );
    }

    saveStorage(
        STORAGE_KEYS.favorites,
        favorites
    );

    if (
        currentView ===
        "favorites"
    ) {
        renderFavorites();
    }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
    const navButtons =
        document.querySelectorAll(
            ".nav-btn"
        );

    navButtons.forEach(
        function (button) {
            button.addEventListener(
                "click",
                function () {
                    const view =
                        button.dataset.view;

                    if (!view) {
                        return;
                    }

                    setActiveNavButton(
                        button
                    );

                    switch (view) {
                        case "home":

                            showHomeView();

                            break;

                        case "search":

                            showSearchView();

                            if (searchInput) {
                                searchInput.focus();
                            }

                            break;

                        case "library":

                            showLibraryView();

                            break;

                        case "favorites":

                            showFavoritesView();

                            break;

                        case "recent":

                            showRecentView();

                            break;

                        default:
                            break;
                    }
                }
            );
        }
    );
}

function setActiveNavButton(button) {
    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            function (item) {
                item.classList.remove(
                    "active"
                );
            }
        );

    if (button) {
        button.classList.add(
            "active"
        );
    }
}

function activateViewButton(view) {
    const button =
        document.querySelector(
            '.nav-btn[data-view="' +
            view +
            '"]'
        );

    if (button) {
        setActiveNavButton(
            button
        );
    }
}

/* =========================================================
   HOME
   ========================================================= */

function showHomeView() {
    currentView =
        "home";

    activateViewButton(
        "home"
    );

    if (
        searchInput &&
        searchInput.value
    ) {
        searchInput.value = "";

        updateSearchClearButton();
    }

    if (homeHero) {
        homeHero.classList.remove(
            "hidden"
        );
    }

    if (sectionLabel) {
        sectionLabel.textContent =
            "REDWAVE";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            "Start listening";
    }

    if (songCount) {
        songCount.textContent = "";
    }

    showSearchStatus("");

    if (musicGrid) {
        musicGrid.innerHTML = "";
    }

    hideAllEmptyStates();
}

/* =========================================================
   SEARCH VIEW
   ========================================================= */

function showSearchView() {
    currentView =
        "search";

    activateViewButton(
        "search"
    );

    if (homeHero) {
        homeHero.classList.add(
            "hidden"
        );
    }

    if (
        currentResults.length > 0
    ) {
        renderSongs(
            currentResults
        );
    } else if (musicGrid) {
        musicGrid.innerHTML = "";
    }
}

/* =========================================================
   LIBRARY
   ========================================================= */

function showLibraryView() {
    currentView =
        "library";

    activateViewButton(
        "library"
    );

    if (homeHero) {
        homeHero.classList.add(
            "hidden"
        );
    }

    if (sectionLabel) {
        sectionLabel.textContent =
            "YOUR LIBRARY";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            "Your music";
    }

    showSearchStatus("");

    hideAllEmptyStates();

    const librarySongs =
        mergeLibrarySongs();

    if (
        librarySongs.length === 0
    ) {
        if (musicGrid) {
            musicGrid.innerHTML = "";
        }

        if (songCount) {
            songCount.textContent =
                "0 songs";
        }

        emptyFavorites?.classList.remove(
            "hidden"
        );

        return;
    }

    if (songCount) {
        songCount.textContent =
            librarySongs.length +
            " songs";
    }

    renderSongs(
        librarySongs
    );
}

function mergeLibrarySongs() {
    const combined = [
        ...favorites,
        ...recentSongs
    ];

    const map =
        new Map();

    combined.forEach(
        function (song) {
            if (
                song &&
                song.videoId &&
                !map.has(song.videoId)
            ) {
                map.set(
                    song.videoId,
                    song
                );
            }
        }
    );

    return Array.from(
        map.values()
    );
}

/* =========================================================
   FAVORITES VIEW
   ========================================================= */

function showFavoritesView() {
    currentView =
        "favorites";

    activateViewButton(
        "favorites"
    );

    if (homeHero) {
        homeHero.classList.add(
            "hidden"
        );
    }

    renderFavorites();
}

function renderFavorites() {
    if (sectionLabel) {
        sectionLabel.textContent =
            "YOUR MUSIC";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            "Liked Songs";
    }

    showSearchStatus("");

    hideAllEmptyStates();

    if (
        favorites.length === 0
    ) {
        if (musicGrid) {
            musicGrid.innerHTML = "";
        }

        if (songCount) {
            songCount.textContent =
                "0 songs";
        }

        emptyFavorites?.classList.remove(
            "hidden"
        );

        return;
    }

    if (songCount) {
        songCount.textContent =
            favorites.length +
            " songs";
    }

    renderSongs(
        favorites
    );
}

/* =========================================================
   RECENT VIEW
   ========================================================= */

function showRecentView() {
    currentView =
        "recent";

    activateViewButton(
        "recent"
    );

    if (homeHero) {
        homeHero.classList.add(
            "hidden"
        );
    }

    renderRecent();
}

function renderRecent() {
    if (sectionLabel) {
        sectionLabel.textContent =
            "YOUR MUSIC";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            "Recently Played";
    }

    showSearchStatus("");

    hideAllEmptyStates();

    if (
        recentSongs.length === 0
    ) {
        if (musicGrid) {
            musicGrid.innerHTML = "";
        }

        if (songCount) {
            songCount.textContent =
                "0 songs";
        }

        emptyRecent?.classList.remove(
            "hidden"
        );

        return;
    }

    if (songCount) {
        songCount.textContent =
            recentSongs.length +
            " songs";
    }

    renderSongs(
        recentSongs
    );
}

/* =========================================================
   PLAYLIST CONTROLS
   ========================================================= */

function setupPlaylistControls() {
    createPlaylistButton?.addEventListener(
        "click",
        openCreatePlaylistModal
    );

    closePlaylistModalButton?.addEventListener(
        "click",
        closeCreatePlaylistModal
    );

    cancelPlaylistButton?.addEventListener(
        "click",
        closeCreatePlaylistModal
    );

    savePlaylistButton?.addEventListener(
        "click",
        createPlaylist
    );

    playlistNameInput?.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Enter"
            ) {
                event.preventDefault();

                createPlaylist();
            }

            if (
                event.key === "Escape"
            ) {
                closeCreatePlaylistModal();
            }
        }
    );

    closeAddPlaylistModalButton?.addEventListener(
        "click",
        closeAddToPlaylistModal
    );

    playlistModal?.addEventListener(
        "click",
        function (event) {
            if (
                event.target ===
                playlistModal
            ) {
                closeCreatePlaylistModal();
            }
        }
    );

    addPlaylistModal?.addEventListener(
        "click",
        function (event) {
            if (
                event.target ===
                addPlaylistModal
            ) {
                closeAddToPlaylistModal();
            }
        }
    );
}

function openCreatePlaylistModal() {
    if (!playlistModal) {
        return;
    }

    playlistModal.classList.remove(
        "hidden"
    );

    if (playlistNameInput) {
        playlistNameInput.value = "";

        setTimeout(
            function () {
                playlistNameInput.focus();
            },
            50
        );
    }
}

function closeCreatePlaylistModal() {
    playlistModal?.classList.add(
        "hidden"
    );
}

function createPlaylist() {
    const name =
        playlistNameInput
            ? playlistNameInput.value.trim()
            : "";

    if (!name) {
        if (playlistNameInput) {
            playlistNameInput.focus();

            playlistNameInput.placeholder =
                "Enter a playlist name";
        }

        return;
    }

    const playlist = {
        id:
            "playlist_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8),

        name:
            name,

        songs:
            [],

        createdAt:
            Date.now()
    };

    playlists.push(
        playlist
    );

    saveStorage(
        STORAGE_KEYS.playlists,
        playlists
    );

    renderPlaylists();

    closeCreatePlaylistModal();
}

/* =========================================================
   RENDER PLAYLISTS
   ========================================================= */

function renderPlaylists() {
    if (!sidebarPlaylists) {
        return;
    }

    sidebarPlaylists.innerHTML = "";

    playlists.forEach(
        function (playlist) {
            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "nav-btn";

            button.type =
                "button";

            button.dataset.playlistId =
                playlist.id;

            const icon =
                document.createElement(
                    "span"
                );

            icon.textContent =
                "♫";

            const name =
                document.createElement(
                    "span"
                );

            name.textContent =
                playlist.name;

            button.appendChild(
                icon
            );

            button.appendChild(
                name
            );

            button.addEventListener(
                "click",
                function () {
                    showPlaylist(
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
   SHOW PLAYLIST
   ========================================================= */

function showPlaylist(playlistId) {
    const playlist =
        playlists.find(
            function (item) {
                return (
                    item.id ===
                    playlistId
                );
            }
        );

    if (!playlist) {
        return;
    }

    currentView =
        "playlist:" +
        playlistId;

    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            function (button) {
                button.classList.remove(
                    "active"
                );
            }
        );

    const playlistButton =
        Array.from(
            document.querySelectorAll(
                ".nav-btn[data-playlist-id]"
            )
        ).find(
            function (button) {
                return (
                    button.dataset.playlistId ===
                    playlistId
                );
            }
        );

    playlistButton?.classList.add(
        "active"
    );

    if (homeHero) {
        homeHero.classList.add(
            "hidden"
        );
    }

    if (sectionLabel) {
        sectionLabel.textContent =
            "PLAYLIST";
    }

    if (sectionTitle) {
        sectionTitle.textContent =
            playlist.name;
    }

    showSearchStatus("");

    hideAllEmptyStates();

    if (
        !Array.isArray(playlist.songs) ||
        playlist.songs.length === 0
    ) {
        if (musicGrid) {
            musicGrid.innerHTML = "";
        }

        if (songCount) {
            songCount.textContent =
                "0 songs";
        }

        emptyPlaylist?.classList.remove(
            "hidden"
        );

        return;
    }

    if (songCount) {
        songCount.textContent =
            playlist.songs.length +
            " songs";
    }

    renderSongs(
        playlist.songs
    );
}

/* =========================================================
   ADD SONG TO PLAYLIST
   ========================================================= */

function openAddToPlaylistModal(song) {
    if (!song) {
        return;
    }

    selectedSongForPlaylist =
        song;

    renderPlaylistPicker();

    addPlaylistModal?.classList.remove(
        "hidden"
    );
}

function closeAddToPlaylistModal() {
    addPlaylistModal?.classList.add(
        "hidden"
    );

    selectedSongForPlaylist =
        null;
}

function renderPlaylistPicker() {
    if (!playlistPicker) {
        return;
    }

    playlistPicker.innerHTML = "";

    if (
        playlists.length === 0
    ) {
        const message =
            document.createElement(
                "div"
            );

        message.className =
            "empty-state";

        message.style.minHeight =
            "150px";

        message.innerHTML =
            '<div class="empty-icon">♫</div>' +
            "<h3>No playlists yet</h3>" +
            "<p>Create a playlist first.</p>";

        playlistPicker.appendChild(
            message
        );

        return;
    }

    playlists.forEach(
        function (playlist) {
            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "playlist-option";

            button.type =
                "button";

            const icon =
                document.createElement(
                    "span"
                );

            icon.textContent =
                "♫";

            const name =
                document.createElement(
                    "span"
                );

            name.style.marginLeft =
                "9px";

            name.textContent =
                playlist.name;

            button.appendChild(
                icon
            );

            button.appendChild(
                name
            );

            button.addEventListener(
                "click",
                function () {
                    addSongToPlaylist(
                        playlist.id
                    );
                }
            );

            playlistPicker.appendChild(
                button
            );
        }
    );
}

function addSongToPlaylist(playlistId) {
    if (!selectedSongForPlaylist) {
        return;
    }

    const playlist =
        playlists.find(
            function (item) {
                return (
                    item.id ===
                    playlistId
                );
            }
        );

    if (!playlist) {
        return;
    }

    if (
        !Array.isArray(
            playlist.songs
        )
    ) {
        playlist.songs = [];
    }

    const alreadyExists =
        playlist.songs.some(
            function (song) {
                return (
                    song.videoId ===
                    selectedSongForPlaylist.videoId
                );
            }
        );

    if (alreadyExists) {
        showSearchStatus(
            "That song is already in this playlist."
        );

        closeAddToPlaylistModal();

        return;
    }

    playlist.songs.push(
        selectedSongForPlaylist
    );

    saveStorage(
        STORAGE_KEYS.playlists,
        playlists
    );

    renderPlaylists();

    closeAddToPlaylistModal();

    if (
        currentView ===
        "playlist:" +
        playlistId
    ) {
        showPlaylist(
            playlistId
        );
    }
}

/* =========================================================
   SPOTIFY IMPORT HELPER
   ========================================================= */

function setupSpotifyImport() {
    openSpotifyImport?.addEventListener(
        "click",
        function () {
            spotifyImportModal?.classList.remove(
                "hidden"
            );

            if (spotifyImportResult) {
                spotifyImportResult.textContent =
                    "";
            }

            if (spotifyPlaylistInput) {
                spotifyPlaylistInput.value = "";

                setTimeout(
                    function () {
                        spotifyPlaylistInput.focus();
                    },
                    50
                );
            }
        }
    );

    closeSpotifyImportButton?.addEventListener(
        "click",
        closeSpotifyImportModal
    );

    cancelSpotifyImport?.addEventListener(
        "click",
        closeSpotifyImportModal
    );

    checkSpotifyPlaylistButton?.addEventListener(
        "click",
        checkSpotifyPlaylistLink
    );

    spotifyPlaylistInput?.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Enter"
            ) {
                event.preventDefault();

                checkSpotifyPlaylistLink();
            }

            if (
                event.key === "Escape"
            ) {
                closeSpotifyImportModal();
            }
        }
    );

    spotifyImportModal?.addEventListener(
        "click",
        function (event) {
            if (
                event.target ===
                spotifyImportModal
            ) {
                closeSpotifyImportModal();
            }
        }
    );
}

function closeSpotifyImportModal() {
    spotifyImportModal?.classList.add(
        "hidden"
    );
}

function checkSpotifyPlaylistLink() {
    const input =
        spotifyPlaylistInput
            ? spotifyPlaylistInput.value.trim()
            : "";

    if (!input) {
        if (spotifyImportResult) {
            spotifyImportResult.textContent =
                "Paste a Spotify playlist link first.";
        }

        return;
    }

    const match =
        input.match(
            /spotify\.com\/playlist\/([a-zA-Z0-9]+)/
        );

    if (!match) {
        if (spotifyImportResult) {
            spotifyImportResult.textContent =
                "That doesn't look like a valid Spotify playlist link.";
        }

        return;
    }

    const playlistId =
        match[1];

    if (spotifyImportResult) {
        spotifyImportResult.innerHTML =
            '<strong style="color: white;">' +
            "Spotify playlist detected" +
            "</strong>" +
            "<br>" +
            '<span style="color: #707070;">' +
            "Playlist ID: " +
            escapeHtml(
                playlistId
            ) +
            "</span>" +
            "<br><br>" +
            '<span style="color: #a7a7a7;">' +
            "The Spotify link was recognized. " +
            "Actual music playback in RedWave uses YouTube." +
            "</span>";
    }
}

/* =========================================================
   QUEUE
   ========================================================= */

function setupQueue() {
    queueButton?.addEventListener(
        "click",
        openQueue
    );

    closeQueueButton?.addEventListener(
        "click",
        closeQueue
    );

    queueOverlay?.addEventListener(
        "click",
        closeQueue
    );
}

function openQueue() {
    queuePanel?.classList.add(
        "visible"
    );

    queueOverlay?.classList.add(
        "visible"
    );

    updateQueueUI();
}

function closeQueue() {
    queuePanel?.classList.remove(
        "visible"
    );

    queueOverlay?.classList.remove(
        "visible"
    );
}

function updateQueueUI() {
    if (
        !queueCurrentCover ||
        !queueCurrentTitle ||
        !queueCurrentArtist ||
        !queueList
    ) {
        return;
    }

    queueCurrentCover.innerHTML =
        "<span>♫</span>";

    if (currentSong) {
        queueCurrentTitle.textContent =
            currentSong.title;

        queueCurrentArtist.textContent =
            currentSong.artist;

        const image =
            document.createElement(
                "img"
            );

        image.src =
            currentSong.cover;

        image.alt =
            currentSong.title;

        image.onerror =
            function () {
                image.style.display =
                    "none";
            };

        queueCurrentCover.innerHTML =
            "";

        queueCurrentCover.appendChild(
            image
        );
    } else {
        queueCurrentTitle.textContent =
            "Nothing playing";

        queueCurrentArtist.textContent =
            "RedWave";
    }

    queueList.innerHTML =
        "";

    if (
        queue.length === 0
    ) {
        queueList.innerHTML =
            '<div class="empty-state" style="min-height: 150px;">' +
            '<div class="empty-icon">♫</div>' +
            "<h3>Queue is empty</h3>" +
            "<p>Play a song to start your queue.</p>" +
            "</div>";

        return;
    }

    queue.forEach(
        function (song, index) {
            if (
                currentSong &&
                song.videoId ===
                currentSong.videoId
            ) {
                return;
            }

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "queue-item";

            const cover =
                document.createElement(
                    "div"
                );

            cover.className =
                "queue-item-cover";

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                song.cover;

            image.alt =
                song.title;

            cover.appendChild(
                image
            );

            const info =
                document.createElement(
                    "div"
                );

            info.className =
                "queue-item-info";

            const title =
                document.createElement(
                    "div"
                );

            title.className =
                "queue-item-title";

            title.textContent =
                song.title;

            const artist =
                document.createElement(
                    "div"
                );

            artist.className =
                "queue-item-artist";

            artist.textContent =
                song.artist;

            info.appendChild(
                title
            );

            info.appendChild(
                artist
            );

            item.appendChild(
                cover
            );

            item.appendChild(
                info
            );

            item.addEventListener(
                "click",
                function () {
                    playSong(
                        song,
                        queue,
                        index
                    );

                    closeQueue();
                }
            );

            queueList.appendChild(
                item
            );
        }
    );
}

/* =========================================================
   PLAYER CONTROLS
   ========================================================= */

function setupPlayerControls() {
    playPauseButton?.addEventListener(
        "click",
        togglePlayPause
    );

    previousButton?.addEventListener(
        "click",
        playPrevious
    );

    nextButton?.addEventListener(
        "click",
        playNext
    );

    shuffleButton?.addEventListener(
        "click",
        toggleShuffle
    );

    repeatButton?.addEventListener(
        "click",
        toggleRepeat
    );

    progressBar?.addEventListener(
        "input",
        seekPlayer
    );

    volumeSlider?.addEventListener(
        "input",
        changeVolume
    );

    volumeIcon?.addEventListener(
        "click",
        toggleMute
    );

    document.addEventListener(
        "keydown",
        handleKeyboardControls
    );

    setInterval(
        updateProgress,
        500
    );
}

/* =========================================================
   PLAY / PAUSE
   ========================================================= */

function togglePlayPause() {
    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        if (currentSong) {
            playYouTubeVideo(
                currentSong.videoId
            );
        } else {
            searchInput?.focus();
        }

        return;
    }

    try {
        const state =
            youtubePlayer.getPlayerState();

        if (
            state ===
            YT.PlayerState.PLAYING
        ) {
            youtubePlayer.pauseVideo();
        } else {
            youtubePlayer.playVideo();
        }
    } catch (error) {
        console.error(
            "RedWave: Play/pause error:",
            error
        );
    }
}

/* =========================================================
   PREVIOUS
   ========================================================= */

function playPrevious() {
    if (
        !queue.length ||
        queueIndex < 0
    ) {
        return;
    }

    if (
        youtubePlayerReady &&
        youtubePlayer
    ) {
        try {
            if (
                youtubePlayer.getCurrentTime() >
                3
            ) {
                youtubePlayer.seekTo(
                    0,
                    true
                );

                return;
            }
        } catch (error) {
            /* Continue to previous song. */
        }
    }

    let newIndex =
        queueIndex - 1;

    if (
        newIndex < 0
    ) {
        newIndex =
            queue.length - 1;
    }

    const song =
        queue[newIndex];

    if (!song) {
        return;
    }

    playSong(
        song,
        queue,
        newIndex
    );
}

/* =========================================================
   NEXT
   ========================================================= */

function playNext() {
    if (
        !queue.length
    ) {
        return;
    }

    if (shuffleEnabled) {
        playRandomQueueSong();

        return;
    }

    let newIndex =
        queueIndex + 1;

    if (
        newIndex >=
        queue.length
    ) {
        if (repeatMode) {
            newIndex = 0;
        } else {
            isPlaying = false;

            updatePlayButton();

            return;
        }
    }

    const song =
        queue[newIndex];

    if (!song) {
        return;
    }

    playSong(
        song,
        queue,
        newIndex
    );
}

/* =========================================================
   RANDOM
   ========================================================= */

function playRandomQueueSong() {
    if (
        queue.length === 0
    ) {
        return;
    }

    if (
        queue.length === 1
    ) {
        playSong(
            queue[0],
            queue,
            0
        );

        return;
    }

    let randomIndex;

    do {
        randomIndex =
            Math.floor(
                Math.random() *
                queue.length
            );
    } while (
        randomIndex ===
        queueIndex
    );

    playSong(
        queue[randomIndex],
        queue,
        randomIndex
    );
}

/* =========================================================
   SONG ENDED
   ========================================================= */

function handleSongEnded() {
    if (repeatMode) {
        if (
            youtubePlayerReady &&
            youtubePlayer
        ) {
            youtubePlayer.playVideo();
        }

        return;
    }

    playNext();
}

/* =========================================================
   SHUFFLE
   ========================================================= */

function toggleShuffle() {
    shuffleEnabled =
        !shuffleEnabled;

    shuffleButton?.classList.toggle(
        "active",
        shuffleEnabled
    );
}

/* =========================================================
   REPEAT
   ========================================================= */

function toggleRepeat() {
    repeatMode =
        !repeatMode;

    repeatButton?.classList.toggle(
        "active",
        repeatMode
    );
}

/* =========================================================
   SEEK
   ========================================================= */

function seekPlayer() {
    if (
        !youtubePlayerReady ||
        !youtubePlayer ||
        !progressBar
    ) {
        return;
    }

    try {
        const duration =
            youtubePlayer.getDuration();

        const percentage =
            Number(
                progressBar.value
            );

        if (
            duration > 0
        ) {
            const targetTime =
                duration *
                percentage /
                100;

            youtubePlayer.seekTo(
                targetTime,
                true
            );
        }
    } catch (error) {
        console.warn(
            "RedWave: Could not seek:",
            error
        );
    }
}

/* =========================================================
   VOLUME
   ========================================================= */

function changeVolume() {
    const volume =
        Number(
            volumeSlider
                ? volumeSlider.value
                : 100
        );

    updateVolumeIcon(
        volume
    );

    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }

    try {
        youtubePlayer.setVolume(
            volume
        );

        if (
            volume > 0
        ) {
            previousVolume =
                volume;

            youtubePlayer.unMute();
        }
    } catch (error) {
        console.warn(
            "RedWave: Could not change volume:",
            error
        );
    }
}

/* =========================================================
   MUTE
   ========================================================= */

function toggleMute() {
    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }

    try {
        const muted =
            youtubePlayer.isMuted();

        if (muted) {
            const restoreVolume =
                previousVolume > 0
                    ? previousVolume
                    : 100;

            youtubePlayer.unMute();

            youtubePlayer.setVolume(
                restoreVolume
            );

            if (volumeSlider) {
                volumeSlider.value =
                    restoreVolume;
            }

            updateVolumeIcon(
                restoreVolume
            );
        } else {
            const currentVolume =
                Number(
                    volumeSlider
                        ? volumeSlider.value
                        : 100
                );

            if (
                currentVolume > 0
            ) {
                previousVolume =
                    currentVolume;
            }

            youtubePlayer.mute();

            if (volumeSlider) {
                volumeSlider.value =
                    0;
            }

            updateVolumeIcon(
                0
            );
        }
    } catch (error) {
        console.warn(
            "RedWave: Mute error:",
            error
        );
    }
}

/* =========================================================
   PROGRESS
   ========================================================= */

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
            Number.isFinite(current) &&
            Number.isFinite(duration) &&
            duration > 0
        ) {
            if (progressBar) {
                progressBar.value =
                    (
                        current /
                        duration
                    ) * 100;
            }

            if (currentTimeElement) {
                currentTimeElement.textContent =
                    formatTime(
                        current
                    );
            }

            if (durationElement) {
                durationElement.textContent =
                    formatTime(
                        duration
                    );
            }
        }
    } catch (error) {
        /* YouTube may temporarily reject state requests. */
    }
}

function formatTime(seconds) {
    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    const remainingSeconds =
        Math.floor(
            seconds % 60
        );

    return (
        minutes +
        ":" +
        String(
            remainingSeconds
        ).padStart(
            2,
            "0"
        )
    );
}

/* =========================================================
   PLAYER UI
   ========================================================= */

function updatePlayerUI() {
    if (
        !playerTitle ||
        !playerArtist ||
        !playerCover
    ) {
        return;
    }

    if (!currentSong) {
        playerTitle.textContent =
            "Nothing playing";

        playerArtist.textContent =
            "Search for a song to begin";

        playerCover.innerHTML =
            "<span>♫</span>";

        updateQueueUI();

        updatePlayButton();

        return;
    }

    playerTitle.textContent =
        currentSong.title;

    playerArtist.textContent =
        currentSong.artist;

    playerCover.innerHTML =
        "";

    const image =
        document.createElement(
            "img"
        );

    image.src =
        currentSong.cover;

    image.alt =
        currentSong.title;

    playerCover.appendChild(
        image
    );

    updatePlayButton();

    updateQueueUI();
}

function updatePlayButton() {
    if (!playPauseButton) {
        return;
    }

    playPauseButton.textContent =
        isPlaying
            ? "❚❚"
            : "▶";
}

/* =========================================================
   VOLUME ICON
   ========================================================= */

function updateVolumeIcon(volume) {
    if (!volumeIcon) {
        return;
    }

    if (
        volume <= 0
    ) {
        volumeIcon.textContent =
            "🔇";
    } else if (
        volume < 45
    ) {
        volumeIcon.textContent =
            "🔉";
    } else {
        volumeIcon.textContent =
            "🔊";
    }
}

/* =========================================================
   KEYBOARD CONTROLS
   ========================================================= */

function handleKeyboardControls(event) {
    const tag =
        event.target?.tagName;

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA"
    ) {
        return;
    }

    if (
        event.code === "Space"
    ) {
        event.preventDefault();

        togglePlayPause();

        return;
    }

    if (
        event.code === "ArrowRight"
    ) {
        if (
            youtubePlayerReady &&
            youtubePlayer
        ) {
            try {
                youtubePlayer.seekTo(
                    youtubePlayer.getCurrentTime() +
                    5,
                    true
                );
            } catch (error) {
                /* Ignore temporary player errors. */
            }
        }

        return;
    }

    if (
        event.code === "ArrowLeft"
    ) {
        if (
            youtubePlayerReady &&
            youtubePlayer
        ) {
            try {
                youtubePlayer.seekTo(
                    Math.max(
                        0,
                        youtubePlayer.getCurrentTime() -
                        5
                    ),
                    true
                );
            } catch (error) {
                /* Ignore temporary player errors. */
            }
        }
    }
}

/* =========================================================
   START LISTENING
   ========================================================= */

function setupStartListening() {
    startListeningButton?.addEventListener(
        "click",
        function () {
            if (!searchInput) {
                return;
            }

            searchInput.focus();

            searchInput.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    );
}

/* =========================================================
   EMPTY STATES
   ========================================================= */

function hideAllEmptyStates() {
    noResults?.classList.add(
        "hidden"
    );

    emptyFavorites?.classList.add(
        "hidden"
    );

    emptyRecent?.classList.add(
        "hidden"
    );

    emptyPlaylist?.classList.add(
        "hidden"
    );
}

function resetEmptyStates() {
    hideAllEmptyStates();
}

/* =========================================================
   SEARCH UI
   ========================================================= */

function updateSearchClearButton() {
    if (!searchWrapper) {
        return;
    }

    const hasValue =
        Boolean(
            searchInput &&
            searchInput.value.trim()
        );

    searchWrapper.classList.toggle(
        "has-value",
        hasValue
    );
}

function showSearchStatus(message) {
    if (!searchStatus) {
        return;
    }

    searchStatus.textContent =
        message || "";
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {
    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

/* =========================================================
   GLOBAL ESCAPE KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    function (event) {
        if (
            event.key !== "Escape"
        ) {
            return;
        }

        closeQueue();

        closeCreatePlaylistModal();

        closeAddToPlaylistModal();

        closeSpotifyImportModal();
    }
);

/* =========================================================
   DEBUG INFORMATION
   ========================================================= */

console.log(
    "RedWave script loaded."
);
