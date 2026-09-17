"use strict";

/* =========================================================
   REDWAVE
   YouTube Music Player
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
    IMPORTANT:
    Paste your existing YouTube Data API key between the quotes.

    Do NOT share this key publicly.
*/
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

const searchInput =
    document.getElementById("searchInput");

const clearSearchButton =
    document.getElementById("clearSearchButton");

const searchWrapper =
    document.querySelector(".search-wrapper");

const queueButton =
    document.getElementById("queueButton");

const queueOverlay =
    document.getElementById("queueOverlay");

const queuePanel =
    document.getElementById("queuePanel");

const closeQueueButton =
    document.getElementById("closeQueueButton");

const queueCurrentCover =
    document.getElementById("queueCurrentCover");

const queueCurrentTitle =
    document.getElementById("queueCurrentTitle");

const queueCurrentArtist =
    document.getElementById("queueCurrentArtist");

const queueList =
    document.getElementById("queueList");


const playerCover =
    document.getElementById("playerCover");

const playerTitle =
    document.getElementById("playerTitle");

const playerArtist =
    document.getElementById("playerArtist");

const shuffleButton =
    document.getElementById("shuffleButton");

const previousButton =
    document.getElementById("previousButton");

const playPauseButton =
    document.getElementById("playPauseButton");

const nextButton =
    document.getElementById("nextButton");

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


const musicGrid =
    document.getElementById("musicGrid");

const sectionLabel =
    document.getElementById("sectionLabel");

const sectionTitle =
    document.getElementById("sectionTitle");

const songCount =
    document.getElementById("songCount");

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

const homeHero =
    document.getElementById("homeHero");

const startListeningButton =
    document.getElementById("startListeningButton");


const sidebarPlaylists =
    document.getElementById("sidebarPlaylists");

const createPlaylistButton =
    document.getElementById("createPlaylistButton");


const playlistModal =
    document.getElementById("playlistModal");

const closePlaylistModal =
    document.getElementById("closePlaylistModal");

const playlistNameInput =
    document.getElementById("playlistNameInput");

const cancelPlaylistButton =
    document.getElementById("cancelPlaylistButton");

const savePlaylistButton =
    document.getElementById("savePlaylistButton");


const addPlaylistModal =
    document.getElementById("addPlaylistModal");

const closeAddPlaylistModal =
    document.getElementById("closeAddPlaylistModal");

const playlistPicker =
    document.getElementById("playlistPicker");


const spotifyImportModal =
    document.getElementById("spotifyImportModal");

const openSpotifyImport =
    document.getElementById("openSpotifyImport");

const closeSpotifyImport =
    document.getElementById("closeSpotifyImport");

const spotifyPlaylistInput =
    document.getElementById("spotifyPlaylistInput");

const spotifyImportResult =
    document.getElementById("spotifyImportResult");

const cancelSpotifyImport =
    document.getElementById("cancelSpotifyImport");

const checkSpotifyPlaylist =
    document.getElementById("checkSpotifyPlaylist");


const youtubePlayerElement =
    document.getElementById("youtubePlayer");

const youtubePlayerWrapper =
    document.querySelector(
        ".youtube-player-wrapper"
    );


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeRedWave
);


function initializeRedWave() {

    setupNavigation();

    setupSearch();

    setupQueue();

    setupPlayerControls();

    setupPlaylistControls();

    setupSpotifyImport();

    renderPlaylists();

    resetEmptyStates();

    updateSearchClearButton();

    updatePlayerUI();

    console.log(
        "RedWave initialized successfully."
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

                    width: "100%",

                    height: "100%",

                    playerVars: {
                        autoplay: 0,
                        controls: 1,
                        playsinline: 1,
                        rel: 0,
                        modestbranding: 1,
                        origin:
                            window.location.origin
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


    try {

        event.target.setVolume(
            Number(volumeSlider?.value || 100)
        );

    } catch (error) {

        console.warn(
            "RedWave: Could not set initial volume.",
            error
        );
    }


    if (
        pendingVideoId &&
        pendingPlayRequest
    ) {

        const videoId =
            pendingVideoId;

        pendingVideoId = null;
        pendingPlayRequest = false;

        playYouTubeVideo(videoId);
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


    showSearchStatus(message);
}


function onYouTubeAutoplayBlocked() {

    console.warn(
        "RedWave: YouTube autoplay was blocked by the browser."
    );

    isPlaying = false;

    updatePlayButton();

    showSearchStatus(
        "Press Play if YouTube blocked automatic playback."
    );
}


/* =========================================================
   PLAY YOUTUBE VIDEO
   ========================================================= */

function playYouTubeVideo(videoId) {

    if (!videoId) {
        return;
    }


    pendingVideoId = videoId;
    pendingPlayRequest = true;


    showYouTubePlayer();


    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {

        console.log(
            "RedWave: Waiting for YouTube player..."
        );

        return;
    }


    try {

        youtubePlayer.loadVideoById({
            videoId: videoId
        });


        pendingVideoId = null;
        pendingPlayRequest = false;

        isPlaying = true;

        updatePlayButton();

    } catch (error) {

        console.error(
            "RedWave: Could not play YouTube video:",
            error
        );

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


            clearTimeout(searchTimer);


            if (!query) {

                searchResults = [];

                currentResults = [];

                showHomeView();

                return;
            }


            currentView = "search";

            showSearchView();


            /*
                Small debounce prevents an API request
                for every single keystroke.
            */
            searchTimer =
                setTimeout(
                    function () {
                        searchYouTube(query);
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


                clearTimeout(searchTimer);

                searchYouTube(query);
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
            "Add your YouTube Data API key in script.js first."
        );

        return;
    }


    currentView = "search";

    showSearchView();


    sectionLabel.textContent =
        "SEARCH RESULTS";

    sectionTitle.textContent =
        `Results for "${query}"`;

    songCount.textContent =
        "";


    searchStatus.textContent =
        "Searching YouTube...";


    musicGrid.innerHTML =
        '<div class="loading">Finding music</div>';


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
            await fetch(url.toString());


        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "RedWave: YouTube API error:",
                data
            );


            throw new Error(
                data?.error?.message ||
                "YouTube API request failed."
            );
        }


        const results =
            Array.isArray(data.items)
                ? data.items
                : [];


        searchResults =
            results
                .filter(
                    item =>
                        item?.id?.videoId
                )
                .map(
                    normalizeYouTubeResult
                );


        currentResults =
            [...searchResults];


        if (
            currentResults.length === 0
        ) {

            musicGrid.innerHTML = "";

            songCount.textContent =
                "0 results";

            searchStatus.textContent =
                "No YouTube results found.";

            noResults.classList.remove(
                "hidden"
            );

            return;
        }


        songCount.textContent =
            `${currentResults.length} results`;


        searchStatus.textContent =
            `Showing YouTube results for "${query}"`;


        renderSongs(
            currentResults
        );

    } catch (error) {

        console.error(
            "RedWave search error:",
            error
        );


        musicGrid.innerHTML = "";

        songCount.textContent = "";

        searchStatus.textContent =
            `Search error: ${error.message}`;


        noResults.classList.add(
            "hidden"
        );
    }
}


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
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;


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
        document.createElement("textarea");

    element.innerHTML =
        String(text);

    return element.value;
}


/* =========================================================
   RENDER SONGS
   ========================================================= */

function renderSongs(songs) {

    musicGrid.innerHTML = "";

    hideAllEmptyStates();


    if (
        !Array.isArray(songs) ||
        songs.length === 0
    ) {

        musicGrid.innerHTML = "";

        return;
    }


    songs.forEach(
        function (song, index) {

            const card =
                createSongCard(
                    song,
                    index
                );

            musicGrid.appendChild(card);
        }
    );
}


function createSongCard(song, index) {

    const card =
        document.createElement("article");

    card.className =
        "song-card";


    const cover =
        document.createElement("div");

    cover.className =
        "song-cover";


    const image =
        document.createElement("img");

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
                `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
        };


    const playOverlay =
        document.createElement("div");

    playOverlay.className =
        "song-play-overlay";

    playOverlay.textContent =
        "▶";


    cover.appendChild(image);

    cover.appendChild(playOverlay);


    const title =
        document.createElement("div");

    title.className =
        "song-title";

    title.textContent =
        song.title;


    const artist =
        document.createElement("div");

    artist.className =
        "song-artist";

    artist.textContent =
        song.artist;


    const actions =
        document.createElement("div");

    actions.className =
        "song-actions";


    const likeButton =
        document.createElement("button");

    likeButton.className =
        "song-action-button";

    likeButton.type =
        "button";

    likeButton.textContent =
        isFavorite(song)
            ? "♥ Liked"
            : "♥ Like";


    const playlistButton =
        document.createElement("button");

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


    card.appendChild(cover);

    card.appendChild(title);

    card.appendChild(artist);

    card.appendChild(actions);


    cover.addEventListener(
        "click",
        function () {
            playSong(
                song,
                songs,
                index
            );
        }
    );


    title.addEventListener(
        "click",
        function () {
            playSong(
                song,
                songs,
                index
            );
        }
    );


    artist.addEventListener(
        "click",
        function () {
            playSong(
                song,
                songs,
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
    sourceList = currentResults,
    index = 0
) {

    if (!song?.videoId) {
        return;
    }


    currentSong =
        song;


    queue =
        Array.isArray(sourceList)
            ? [...sourceList]
            : [];


    queueIndex =
        Math.max(
            0,
            Number(index)
        );


    addToRecent(song);

    updatePlayerUI();

    updateQueueUI();


    playYouTubeVideo(
        song.videoId
    );
}


/* =========================================================
   RECENT SONGS
   ========================================================= */

function addToRecent(song) {

    if (!song) {
        return;
    }


    recentSongs =
        recentSongs.filter(
            item =>
                item.videoId !==
                song.videoId
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

    if (!song?.videoId) {
        return false;
    }


    return favorites.some(
        item =>
            item.videoId ===
            song.videoId
    );
}


function toggleFavorite(song) {

    if (!song?.videoId) {
        return;
    }


    if (isFavorite(song)) {

        favorites =
            favorites.filter(
                item =>
                    item.videoId !==
                    song.videoId
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

                            if (
                                searchInput
                            ) {
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
            item =>
                item.classList.remove(
                    "active"
                )
        );


    button.classList.add(
        "active"
    );
}


function activateViewButton(view) {

    const button =
        document.querySelector(
            `.nav-btn[data-view="${view}"]`
        );


    if (button) {
        setActiveNavButton(button);
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


    if (searchInput?.value) {
        searchInput.value = "";

        updateSearchClearButton();
    }


    homeHero.classList.remove(
        "hidden"
    );


    sectionLabel.textContent =
        "REDWAVE";

    sectionTitle.textContent =
        "Start listening";


    songCount.textContent =
        "";


    searchStatus.textContent =
        "";


    musicGrid.innerHTML = "";

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


    homeHero.classList.add(
        "hidden"
    );


    if (
        currentResults.length > 0
    ) {

        renderSongs(
            currentResults
        );

    } else {

        musicGrid.innerHTML = "";
    }
}


/* =========================================================
   LIBRARY VIEW
   ========================================================= */

function showLibraryView() {

    currentView =
        "library";


    activateViewButton(
        "library"
    );


    homeHero.classList.add(
        "hidden"
    );


    sectionLabel.textContent =
        "YOUR LIBRARY";

    sectionTitle.textContent =
        "Your music";


    searchStatus.textContent =
        "";


    hideAllEmptyStates();


    const librarySongs =
        mergeLibrarySongs();


    if (
        librarySongs.length === 0
    ) {

        musicGrid.innerHTML = "";

        songCount.textContent =
            "0 songs";

        emptyFavorites.classList.remove(
            "hidden"
        );

        return;
    }


    songCount.textContent =
        `${librarySongs.length} songs`;


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
        song => {

            if (
                song?.videoId &&
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


    homeHero.classList.add(
        "hidden"
    );


    renderFavorites();
}


function renderFavorites() {

    sectionLabel.textContent =
        "YOUR MUSIC";

    sectionTitle.textContent =
        "Liked Songs";


    searchStatus.textContent =
        "";


    hideAllEmptyStates();


    if (
        favorites.length === 0
    ) {

        musicGrid.innerHTML = "";

        songCount.textContent =
            "0 songs";

        emptyFavorites.classList.remove(
            "hidden"
        );

        return;
    }


    songCount.textContent =
        `${favorites.length} songs`;


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


    homeHero.classList.add(
        "hidden"
    );


    renderRecent();
}


function renderRecent() {

    sectionLabel.textContent =
        "YOUR MUSIC";

    sectionTitle.textContent =
        "Recently Played";


    searchStatus.textContent =
        "";


    hideAllEmptyStates();


    if (
        recentSongs.length === 0
    ) {

        musicGrid.innerHTML = "";

        songCount.textContent =
            "0 songs";

        emptyRecent.classList.remove(
            "hidden"
        );

        return;
    }


    songCount.textContent =
        `${recentSongs.length} songs`;


    renderSongs(
        recentSongs
    );
}


/* =========================================================
   PLAYLISTS
   ========================================================= */

function setupPlaylistControls() {

    if (createPlaylistButton) {

        createPlaylistButton.addEventListener(
            "click",
            openCreatePlaylistModal
        );
    }


    if (closePlaylistModal) {

        closePlaylistModal.addEventListener(
            "click",
            closeCreatePlaylistModal
        );
    }


    if (cancelPlaylistButton) {

        cancelPlaylistButton.addEventListener(
            "click",
            closeCreatePlaylistModal
        );
    }


    if (savePlaylistButton) {

        savePlaylistButton.addEventListener(
            "click",
            createPlaylist
        );
    }


    if (playlistNameInput) {

        playlistNameInput.addEventListener(
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
    }


    if (closeAddPlaylistModal) {

        closeAddPlaylistModal.addEventListener(
            "click",
            closeAddToPlaylistModal
        );
    }


    if (playlistModal) {

        playlistModal.addEventListener(
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
    }


    if (addPlaylistModal) {

        addPlaylistModal.addEventListener(
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
        playlistNameInput?.value.trim();


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
            `playlist_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        name: name,

        songs: [],

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


function renderPlaylists() {

    if (!sidebarPlaylists) {
        return;
    }


    sidebarPlaylists.innerHTML = "";


    playlists.forEach(
        function (playlist) {

            const button =
                document.createElement("button");


            button.className =
                "nav-btn";


            button.type =
                "button";


            button.dataset.playlistId =
                playlist.id;


            button.innerHTML = `
                <span>♫</span>
                <span>${escapeHtml(playlist.name)}</span>
            `;


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


function showPlaylist(playlistId) {

    const playlist =
        playlists.find(
            item =>
                item.id ===
                playlistId
        );


    if (!playlist) {
        return;
    }


    currentView =
        `playlist:${playlistId}`;


    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


    const playlistButton =
        document.querySelector(
            `.nav-btn[data-playlist-id="${CSS.escape(playlistId)}"]`
        );


    playlistButton?.classList.add(
        "active"
    );


    homeHero.classList.add(
        "hidden"
    );


    sectionLabel.textContent =
        "PLAYLIST";


    sectionTitle.textContent =
        playlist.name;


    searchStatus.textContent =
        "";


    hideAllEmptyStates();


    if (
        !playlist.songs ||
        playlist.songs.length === 0
    ) {

        musicGrid.innerHTML = "";

        songCount.textContent =
            "0 songs";

        emptyPlaylist.classList.remove(
            "hidden"
        );

        return;
    }


    songCount.textContent =
        `${playlist.songs.length} songs`;


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


    if (playlists.length === 0) {

        const message =
            document.createElement("div");


        message.className =
            "empty-state";


        message.style.minHeight =
            "150px";


        message.innerHTML = `
            <div class="empty-icon">♫</div>
            <h3>No playlists yet</h3>
            <p>Create a playlist first.</p>
        `;


        playlistPicker.appendChild(
            message
        );

        return;
    }


    playlists.forEach(
        function (playlist) {

            const button =
                document.createElement("button");


            button.className =
                "playlist-option";


            button.type =
                "button";


            button.innerHTML = `
                <span>♫</span>
                <span style="margin-left: 9px;">
                    ${escapeHtml(playlist.name)}
                </span>
            `;


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

    if (
        !selectedSongForPlaylist
    ) {
        return;
    }


    const playlist =
        playlists.find(
            item =>
                item.id ===
                playlistId
        );


    if (!playlist) {
        return;
    }


    if (!Array.isArray(playlist.songs)) {
        playlist.songs = [];
    }


    const alreadyExists =
        playlist.songs.some(
            song =>
                song.videoId ===
                selectedSongForPlaylist.videoId
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
        `playlist:${playlistId}`
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

            spotifyImportResult.textContent =
                "";

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


    closeSpotifyImport?.addEventListener(
        "click",
        closeSpotifyImportModal
    );


    cancelSpotifyImport?.addEventListener(
        "click",
        closeSpotifyImportModal
    );


    checkSpotifyPlaylist?.addEventListener(
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
        spotifyPlaylistInput?.value.trim();


    if (!input) {

        spotifyImportResult.textContent =
            "Paste a Spotify playlist link first.";

        return;
    }


    const match =
        input.match(
            /spotify\.com\/playlist\/([a-zA-Z0-9]+)/
        );


    if (!match) {

        spotifyImportResult.textContent =
            "That doesn't look like a valid Spotify playlist link.";

        return;
    }


    const playlistId =
        match[1];


    spotifyImportResult.innerHTML = `
        <strong style="color: white;">
            Spotify playlist detected
        </strong>
        <br>
        <span style="color: #707070;">
            Playlist ID: ${escapeHtml(playlistId)}
        </span>
        <br><br>
        <span style="color: #a7a7a7;">
            Spotify playlist metadata can be connected here later.
            Actual music playback in RedWave uses YouTube.
        </span>
    `;
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
            document.createElement("img");


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


    queueList.innerHTML = "";


    if (
        queue.length === 0
    ) {

        queueList.innerHTML = `
            <div class="empty-state"
                 style="min-height: 150px;">
                <div class="empty-icon">♫</div>
                <h3>Queue is empty</h3>
                <p>Play a song to start your queue.</p>
            </div>
        `;

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
                document.createElement("div");


            item.className =
                "queue-item";


            const cover =
                document.createElement("div");


            cover.className =
                "queue-item-cover";


            const image =
                document.createElement("img");


            image.src =
                song.cover;

            image.alt =
                song.title;


            cover.appendChild(
                image
            );


            const info =
                document.createElement("div");


            info.className =
                "queue-item-info";


            const title =
                document.createElement("div");


            title.className =
                "queue-item-title";

            title.textContent =
                song.title;


            const artist =
                document.createElement("div");


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


/* PLAY / PAUSE */

function togglePlayPause() {

    if (!youtubePlayerReady ||
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


/* PREVIOUS */

function playPrevious() {

    if (
        !queue.length ||
        queueIndex < 0
    ) {
        return;
    }


    let newIndex =
        queueIndex - 1;


    if (newIndex < 0) {

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


/* NEXT */

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
        newIndex >= queue.length
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


/* RANDOM */

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


/* SONG ENDED */

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


/* SHUFFLE */

function toggleShuffle() {

    shuffleEnabled =
        !shuffleEnabled;


    shuffleButton?.classList.toggle(
        "active",
        shuffleEnabled
    );
}


/* REPEAT */

function toggleRepeat() {

    repeatMode =
        !repeatMode;


    repeatButton?.classList.toggle(
        "active",
        repeatMode
    );
}


/* SEEK */

function seekPlayer() {

    if (
        !youtubePlayerReady ||
        !youtubePlayer
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


/* VOLUME */

function changeVolume() {

    if (
        !youtubePlayerReady ||
        !youtubePlayer
    ) {
        return;
    }


    const volume =
        Number(
            volumeSlider.value
        );


    try {

        youtubePlayer.setVolume(
            volume
        );

    } catch (error) {

        console.warn(
            "RedWave: Could not change volume:",
            error
        );
    }


    updateVolumeIcon(
        volume
    );
}


/* MUTE */

let previousVolume = 100;


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

            youtubePlayer.unMute();


            youtubePlayer.setVolume(
                previousVolume
            );


            volumeSlider.value =
                previousVolume;


            updateVolumeIcon(
                previousVolume
            );

        } else {

            previousVolume =
                Number(
                    volumeSlider.value
                );


            youtubePlayer.mute();


            volumeSlider.value =
                0;


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

            progressBar.value =
                (
                    current /
                    duration
                ) * 100;


            currentTimeElement.textContent =
                formatTime(current);


            durationElement.textContent =
                formatTime(duration);

        }

    } catch (error) {

        /*
            Ignore temporary player-state errors.
        */
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


    return `${minutes}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;
}


/* =========================================================
   PLAYER UI
   ========================================================= */

function updatePlayerUI() {

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
        document.createElement("img");


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


    if (volume <= 0) {

        volumeIcon.textContent =
            "🔇";

    } else if (volume < 45) {

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
                    youtubePlayer.getCurrentTime() + 5,
                    true
                );

            } catch (error) {}
        }
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
                        youtubePlayer.getCurrentTime() - 5
                    ),
                    true
                );

            } catch (error) {}
        }
    }
}


/* =========================================================
   START LISTENING
   ========================================================= */

if (startListeningButton) {

    startListeningButton.addEventListener(
        "click",
        function () {

            searchInput?.focus();

            searchInput?.scrollIntoView({
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
            searchInput?.value.trim()
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
        message;
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
   INITIAL VOLUME ICON
   ========================================================= */

updateVolumeIcon(
    Number(
        volumeSlider?.value || 100
    )
);


/* =========================================================
   DEBUG INFORMATION
   ========================================================= */

console.log(
    "RedWave script loaded."
);

console.log(
    "YouTube player element:",
    youtubePlayerElement
);

console.log(
    "YouTube API:",
    YOUTUBE_API_KEY ===
        "PASTE_YOUR_YOUTUBE_API_KEY_HERE"
        ? "API KEY NOT SET"
        : "API KEY SET"
);
