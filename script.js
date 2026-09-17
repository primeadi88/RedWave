/* =========================================
   REDWAVE MUSIC PLAYER
   Jamendo + Playlists + Player
========================================= */


/* =========================================
   CONFIGURATION
========================================= */

const JAMENDO_CLIENT_ID = "2d629d2a";

const JAMENDO_API =
  "https://api.jamendo.com/v3.0/tracks/";

const STORAGE_KEYS = {
  favorites: "redwave-favorites",
  recentlyPlayed: "redwave-recently-played",
  playlists: "redwave-playlists"
};


/* =========================================
   AUDIO
========================================= */

const audio = document.getElementById("audioPlayer");

audio.preload = "metadata";
audio.volume = 0.8;


/* =========================================
   DOM ELEMENTS
========================================= */

const searchInput =
  document.getElementById("searchInput");

const clearSearchButton =
  document.getElementById("clearSearchButton");

const searchBox =
  document.querySelector(".search-box");

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

const emptyPlaylistTitle =
  document.getElementById("emptyPlaylistTitle");

const sectionLabel =
  document.getElementById("sectionLabel");

const sectionTitle =
  document.getElementById("sectionTitle");

const songCount =
  document.getElementById("songCount");

const startButton =
  document.getElementById("startButton");

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

const progressFill =
  document.getElementById("progressFill");

const timeCurrent =
  document.getElementById("timeCurrent");

const timeDuration =
  document.getElementById("timeDuration");

const volumeSlider =
  document.getElementById("volumeSlider");

const volumeIcon =
  document.getElementById("volumeIcon");

const miniCover =
  document.getElementById("miniCover");

const nowPlayingTitle =
  document.getElementById("nowPlayingTitle");

const nowPlayingArtist =
  document.getElementById("nowPlayingArtist");

const queuePanel =
  document.getElementById("queuePanel");

const queueOverlay =
  document.getElementById("queueOverlay");

const queueOpenButton =
  document.getElementById("queueOpenButton");

const queueCloseButton =
  document.getElementById("queueCloseButton");

const queueList =
  document.getElementById("queueList");

const queueCurrentCover =
  document.getElementById("queueCurrentCover");

const queueCurrentTitle =
  document.getElementById("queueCurrentTitle");

const queueCurrentArtist =
  document.getElementById("queueCurrentArtist");

const favoritesSidebarButton =
  document.getElementById("favoritesSidebarButton");

const recentSidebarButton =
  document.getElementById("recentSidebarButton");

const sidebarPlaylists =
  document.getElementById("sidebarPlaylists");

const createPlaylistButton =
  document.getElementById("createPlaylistButton");


/* =========================================
   PLAYLIST MODAL
========================================= */

const playlistModal =
  document.getElementById("playlistModal");

const playlistModalClose =
  document.getElementById("playlistModalClose");

const playlistNameInput =
  document.getElementById("playlistNameInput");

const playlistCancelButton =
  document.getElementById("playlistCancelButton");

const playlistCreateButton =
  document.getElementById("playlistCreateButton");


/* =========================================
   ADD TO PLAYLIST MODAL
========================================= */

const addPlaylistModal =
  document.getElementById("addPlaylistModal");

const addPlaylistModalClose =
  document.getElementById("addPlaylistModalClose");

const addPlaylistSongName =
  document.getElementById("addPlaylistSongName");

const playlistPicker =
  document.getElementById("playlistPicker");

const createPlaylistFromPicker =
  document.getElementById("createPlaylistFromPicker");


/* =========================================
   STATE
========================================= */

let searchResults = [];

let currentSongIndex = -1;

let currentView = "home";

let currentPlaylistId = null;

let shuffleEnabled = false;

let repeatMode = 0;

/*
  repeatMode:
  0 = off
  1 = repeat all
  2 = repeat one
*/

let isLoadingSearch = false;

let currentAddPlaylistSong = null;

let lastSearchRequest = 0;


/* =========================================
   STORAGE
========================================= */

function loadStorage(key, fallback) {

  try {

    const saved =
      localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    return JSON.parse(saved);

  } catch (error) {

    console.error(
      "Storage error:",
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
      "Could not save data:",
      error
    );
  }
}


/* =========================================
   FAVORITES
========================================= */

let favorites =
  loadStorage(
    STORAGE_KEYS.favorites,
    []
  );


function saveFavorites() {

  saveStorage(
    STORAGE_KEYS.favorites,
    favorites
  );
}


function isFavorite(song) {

  if (!song) {
    return false;
  }

  return favorites.some(
    item =>
      String(item.id) ===
      String(song.id)
  );
}


function toggleFavorite(song) {

  if (!song) {
    return;
  }

  const existingIndex =
    favorites.findIndex(
      item =>
        String(item.id) ===
        String(song.id)
    );

  if (existingIndex !== -1) {

    favorites.splice(
      existingIndex,
      1
    );

  } else {

    favorites.unshift(song);

    if (favorites.length > 500) {
      favorites = favorites.slice(
        0,
        500
      );
    }
  }

  saveFavorites();

  updateFavoriteButtons();

  if (currentView === "favorites") {
    renderCurrentView();
  }
}


/* =========================================
   RECENTLY PLAYED
========================================= */

let recentlyPlayed =
  loadStorage(
    STORAGE_KEYS.recentlyPlayed,
    []
  );


function saveRecentlyPlayed() {

  saveStorage(
    STORAGE_KEYS.recentlyPlayed,
    recentlyPlayed
  );
}


function addRecentlyPlayed(song) {

  if (!song) {
    return;
  }

  recentlyPlayed =
    recentlyPlayed.filter(
      item =>
        String(item.id) !==
        String(song.id)
    );

  recentlyPlayed.unshift(song);

  recentlyPlayed =
    recentlyPlayed.slice(
      0,
      50
    );

  saveRecentlyPlayed();
}


/* =========================================
   PLAYLISTS
========================================= */

let playlists =
  loadStorage(
    STORAGE_KEYS.playlists,
    []
  );


function savePlaylists() {

  saveStorage(
    STORAGE_KEYS.playlists,
    playlists
  );
}


function generatePlaylistId() {

  return (
    "playlist-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}


function createPlaylist(name) {

  const cleanName =
    String(name || "")
      .trim()
      .slice(0, 50);

  if (!cleanName) {
    return null;
  }

  const playlist = {
    id: generatePlaylistId(),

    name: cleanName,

    createdAt:
      new Date().toISOString(),

    songs: []
  };

  playlists.unshift(
    playlist
  );

  savePlaylists();

  renderSidebarPlaylists();

  return playlist;
}


function deletePlaylist(playlistId) {

  const playlist =
    playlists.find(
      item =>
        item.id === playlistId
    );

  if (!playlist) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${playlist.name}"?`
    );

  if (!confirmed) {
    return;
  }

  playlists =
    playlists.filter(
      item =>
        item.id !== playlistId
    );

  savePlaylists();

  if (
    currentView === "playlist" &&
    currentPlaylistId === playlistId
  ) {

    currentView = "library";

    currentPlaylistId = null;
  }

  renderSidebarPlaylists();

  renderCurrentView();
}


function renamePlaylist(playlistId) {

  const playlist =
    playlists.find(
      item =>
        item.id === playlistId
    );

  if (!playlist) {
    return;
  }

  const newName =
    window.prompt(
      "Enter a new playlist name:",
      playlist.name
    );

  if (
    newName === null ||
    !newName.trim()
  ) {
    return;
  }

  playlist.name =
    newName
      .trim()
      .slice(0, 50);

  savePlaylists();

  renderSidebarPlaylists();

  renderCurrentView();
}


function addSongToPlaylist(
  playlistId,
  song
) {

  if (!song) {
    return false;
  }

  const playlist =
    playlists.find(
      item =>
        item.id === playlistId
    );

  if (!playlist) {
    return false;
  }

  const alreadyExists =
    playlist.songs.some(
      item =>
        String(item.id) ===
        String(song.id)
    );

  if (alreadyExists) {

    alert(
      `"${song.title}" is already in this playlist.`
    );

    return false;
  }

  playlist.songs.push(song);

  savePlaylists();

  renderSidebarPlaylists();

  return true;
}


function removeSongFromPlaylist(
  playlistId,
  songId
) {

  const playlist =
    playlists.find(
      item =>
        item.id === playlistId
    );

  if (!playlist) {
    return;
  }

  playlist.songs =
    playlist.songs.filter(
      song =>
        String(song.id) !==
        String(songId)
    );

  savePlaylists();

  renderCurrentView();

  renderSidebarPlaylists();
}


/* =========================================
   HELPERS
========================================= */

function escapeHTML(value) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    value ?? "";

  return div.innerHTML;
}


function formatTime(seconds) {

  const value =
    Number(seconds);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "0:00";
  }

  const minutes =
    Math.floor(value / 60);

  const remainingSeconds =
    Math.floor(value % 60)
      .toString()
      .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}


function getCurrentSong() {

  if (
    currentSongIndex < 0 ||
    currentSongIndex >=
      searchResults.length
  ) {
    return null;
  }

  return searchResults[
    currentSongIndex
  ];
}


function getPlaylistById(
  playlistId
) {

  return playlists.find(
    playlist =>
      playlist.id === playlistId
  );
}


function getPlaylistSongs() {

  const playlist =
    getPlaylistById(
      currentPlaylistId
    );

  if (!playlist) {
    return [];
  }

  return playlist.songs || [];
}


/* =========================================
   JAMENDO API
========================================= */

async function searchJamendo(
  query
) {

  const trimmed =
    String(query || "")
      .trim();

  if (!trimmed) {

    return [];
  }

  const params =
    new URLSearchParams();

  params.set(
    "client_id",
    JAMENDO_CLIENT_ID
  );

  params.set(
    "format",
    "json"
  );

  params.set(
    "limit",
    "30"
  );

  params.set(
    "search",
    trimmed
  );

  params.set(
    "audioformat",
    "mp32"
  );

  params.set(
    "imagesize",
    "300"
  );

  params.set(
    "type",
    "single albumtrack"
  );

  const url =
    `${JAMENDO_API}?${params.toString()}`;

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      `Jamendo request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    !data.headers ||
    data.headers.status !==
      "success"
  ) {

    throw new Error(
      data?.headers?.error_message ||
      "Jamendo API returned an error."
    );
  }

  return (
    data.results || []
  ).map(
    normalizeJamendoSong
  );
}


function normalizeJamendoSong(
  track
) {

  return {
    id:
      String(track.id),

    title:
      track.name ||
      "Unknown Song",

    artist:
      track.artist_name ||
      "Unknown Artist",

    album:
      track.album_name ||
      "Single",

    duration:
      Number(track.duration) || 0,

    artwork:
      track.image ||
      track.album_image ||
      "",

    streamUrl:
      track.audio ||
      "",

    downloadUrl:
      track.audiodownload_allowed
        ? track.audiodownload
        : "",

    downloadAllowed:
      Boolean(
        track.audiodownload_allowed
      ),

    licenseUrl:
      track.license_ccurl ||
      "",

    sourceUrl:
      track.shareurl ||
      "",

    source:
      "Jamendo"
  };
}


/* =========================================
   SEARCH
========================================= */

let searchTimer = null;


function updateSearchUI() {

  const hasText =
    searchInput.value.trim()
      .length > 0;

  searchBox.classList.toggle(
    "has-text",
    hasText
  );
}


function showSearchStatus(
  message,
  type = ""
) {

  searchStatus.textContent =
    message;

  searchStatus.className =
    "search-status";

  if (type) {
    searchStatus.classList.add(
      type
    );
  }

  searchStatus.classList.remove(
    "hidden"
  );
}


function hideSearchStatus() {

  searchStatus.classList.add(
    "hidden"
  );
}


async function performSearch(
  query
) {

  const trimmed =
    String(query || "")
      .trim();

  if (!trimmed) {

    searchResults = [];

    currentView = "home";

    currentPlaylistId = null;

    hideSearchStatus();

    renderCurrentView();

    return;
  }

  const requestId =
    ++lastSearchRequest;

  isLoadingSearch = true;

  currentView = "search";

  currentPlaylistId = null;

  noResults.classList.add(
    "hidden"
  );

  emptyFavorites.classList.add(
    "hidden"
  );

  emptyRecent.classList.add(
    "hidden"
  );

  emptyPlaylist.classList.add(
    "hidden"
  );

  showSearchStatus(
    `Searching Jamendo for "${trimmed}"...`,
    "loading"
  );

  try {

    const results =
      await searchJamendo(
        trimmed
      );

    if (
      requestId !==
      lastSearchRequest
    ) {
      return;
    }

    searchResults =
      results;

    isLoadingSearch = false;

    if (results.length === 0) {

      showSearchStatus(
        `No results found for "${trimmed}".`
      );

      renderCurrentView();

      return;
    }

    showSearchStatus(
      `Found ${results.length} results for "${trimmed}".`
    );

    renderCurrentView();

  } catch (error) {

    console.error(
      "Jamendo search error:",
      error
    );

    isLoadingSearch = false;

    searchResults = [];

    showSearchStatus(
      "Could not connect to the music service. Check your internet connection and try again.",
      "error"
    );

    renderCurrentView();
  }
}


/* =========================================
   RENDER MUSIC CARDS
========================================= */

function renderMusicCards(
  songs
) {

  musicGrid.innerHTML = "";

  if (!songs.length) {

    musicGrid.classList.add(
      "hidden"
    );

    return;
  }

  musicGrid.classList.remove(
    "hidden"
  );

  songs.forEach(
    (song, index) => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "music-card";

      card.dataset.index =
        index;

      card.dataset.songId =
        song.id;

      if (
        getCurrentSong() &&
        String(
          getCurrentSong().id
        ) ===
          String(song.id)
      ) {

        card.classList.add(
          "active"
        );
      }

      const artwork =
        song.artwork
          ? `
            <img
              src="${escapeHTML(song.artwork)}"
              alt="${escapeHTML(song.title)} artwork"
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >
            <div
              class="album-fallback artwork-one"
              style="display:none;"
            >
              ♪
            </div>
          `
          : `
            <div
              class="album-fallback artwork-one"
            >
              ♪
            </div>
          `;

      const favoriteClass =
        isFavorite(song)
          ? "active"
          : "";

      const favoriteSymbol =
        isFavorite(song)
          ? "♥"
          : "♡";

      card.innerHTML = `

        <div class="album-container">

          ${artwork}

          <button
            class="card-play-button"
            data-action="play"
            title="Play"
          >
            ▶
          </button>

        </div>

        <div class="song-info">

          <button
            class="favorite-button ${favoriteClass}"
            data-action="favorite"
            title="Like song"
          >
            ${favoriteSymbol}
          </button>

          <button
            class="card-menu-button"
            data-action="playlist"
            title="Add to playlist"
          >
            +
          </button>

          <h3>
            ${escapeHTML(song.title)}
          </h3>

          <p>
            ${escapeHTML(song.artist)}
          </p>

          <p class="album-name">
            ${escapeHTML(song.album)}
          </p>

        </div>
      `;

      musicGrid.appendChild(
        card
      );
    }
  );
}


/* =========================================
   RENDER CURRENT VIEW
========================================= */

function renderCurrentView() {

  musicGrid.classList.remove(
    "hidden"
  );

  noResults.classList.add(
    "hidden"
  );

  emptyFavorites.classList.add(
    "hidden"
  );

  emptyRecent.classList.add(
    "hidden"
  );

  emptyPlaylist.classList.add(
    "hidden"
  );

  if (
    currentView === "favorites"
  ) {

    renderFavoritesView();

    return;
  }

  if (
    currentView === "recent"
  ) {

    renderRecentView();

    return;
  }

  if (
    currentView === "playlist"
  ) {

    renderPlaylistView();

    return;
  }

  if (
    currentView === "library"
  ) {

    renderLibraryView();

    return;
  }

  if (
    currentView === "search"
  ) {

    renderSearchView();

    return;
  }

  renderHomeView();
}


/* =========================================
   HOME
========================================= */

function renderHomeView() {

  sectionLabel.textContent =
    "DISCOVER";

  sectionTitle.textContent =
    "Online Music";

  if (!searchResults.length) {

    musicGrid.innerHTML = "";

    musicGrid.classList.add(
      "hidden"
    );

    songCount.textContent =
      "Search for music";

    noResults.classList.add(
      "hidden"
    );

    return;
  }

  renderMusicCards(
    searchResults
  );

  songCount.textContent =
    `${searchResults.length} songs`;
}


/* =========================================
   SEARCH VIEW
========================================= */

function renderSearchView() {

  sectionLabel.textContent =
    "SEARCH RESULTS";

  sectionTitle.textContent =
    "Music Search";

  if (
    isLoadingSearch
  ) {

    musicGrid.innerHTML = "";

    musicGrid.classList.add(
      "hidden"
    );

    songCount.textContent =
      "Searching...";

    return;
  }

  if (!searchResults.length) {

    musicGrid.innerHTML = "";

    musicGrid.classList.add(
      "hidden"
    );

    noResults.classList.remove(
      "hidden"
    );

    songCount.textContent =
      "0 songs";

    return;
  }

  renderMusicCards(
    searchResults
  );

  songCount.textContent =
    `${searchResults.length} songs`;
}


/* =========================================
   FAVORITES VIEW
========================================= */

function renderFavoritesView() {

  sectionLabel.textContent =
    "YOUR MUSIC";

  sectionTitle.textContent =
    "Liked Songs";

  const songs =
    favorites;

  if (!songs.length) {

    musicGrid.innerHTML = "";

    musicGrid.classList.add(
      "hidden"
    );

    emptyFavorites.classList.remove(
      "hidden"
    );

    songCount.textContent =
      "0 songs";

    return;
  }

  searchResults =
    songs;

  renderMusicCards(
    songs
  );

  songCount.textContent =
    `${songs.length} songs`;
}


/* =========================================
   RECENT VIEW
========================================= */

function renderRecentView() {

  sectionLabel.textContent =
    "HISTORY";

  sectionTitle.textContent =
    "Recently Played";

  const songs =
    recentlyPlayed;

  if (!songs.length) {

    musicGrid.innerHTML = "";

    musicGrid.classList.add(
      "hidden"
    );

    emptyRecent.classList.remove(
      "hidden"
    );

    songCount.textContent =
      "0 songs";

    return;
  }

  searchResults =
    songs;

  renderMusicCards(
    songs
  );

  songCount.textContent =
    `${songs.length} songs`;
}


/* =========================================
   LIBRARY VIEW
========================================= */

function renderLibraryView() {

  sectionLabel.textContent =
    "YOUR LIBRARY";

  sectionTitle.textContent =
    "Your Music";

  const librarySongs = [
    ...favorites,
    ...recentlyPlayed
  ];

  const uniqueSongs =
    [];

  const seen =
    new Set();

  librarySongs.forEach(
    song => {

      const id =
        String(song.id);

      if (!seen.has(id)) {

        seen.add(id);

        uniqueSongs.push(
          song
        );
      }
    }
  );

  searchResults =
    uniqueSongs;

  if (!uniqueSongs.length) {

    musicGrid.innerHTML = "";

    musicGrid.classList.add(
      "hidden"
    );

    emptyRecent.classList.remove(
      "hidden"
    );

    emptyRecent.querySelector(
      "h3"
    ).textContent =
      "Your library is empty";

    emptyRecent.querySelector(
      "p"
    ).textContent =
      "Search for music and like songs to build your library.";

    songCount.textContent =
      "0 songs";

    return;
  }

  renderMusicCards(
    uniqueSongs
  );

  songCount.textContent =
    `${uniqueSongs.length} songs`;
}


/* =========================================
   PLAYLIST VIEW
========================================= */

function renderPlaylistView() {

  const playlist =
    getPlaylistById(
      currentPlaylistId
    );

  if (!playlist) {

    currentView =
      "library";

    currentPlaylistId =
      null;

    renderLibraryView();

    return;
  }

  sectionLabel.textContent =
    "PLAYLIST";

  sectionTitle.textContent =
    playlist.name;

  const songs =
    playlist.songs || [];

  if (!songs.length) {

    musicGrid.innerHTML = "";

    musicGrid.classList.add(
      "hidden"
    );

    emptyPlaylist.classList.remove(
      "hidden"
    );

    emptyPlaylistTitle.textContent =
      `"${playlist.name}" is empty`;

    songCount.textContent =
      "0 songs";

    return;
  }

  searchResults =
    songs;

  renderMusicCards(
    songs
  );

  songCount.textContent =
    `${songs.length} songs`;
}


/* =========================================
   UPDATE FAVORITE BUTTONS
========================================= */

function updateFavoriteButtons() {

  document
    .querySelectorAll(
      ".favorite-button"
    )
    .forEach(
      button => {

        const card =
          button.closest(
            ".music-card"
          );

        if (!card) {
          return;
        }

        const index =
          Number(
            card.dataset.index
          );

        const song =
          searchResults[index];

        if (!song) {
          return;
        }

        const active =
          isFavorite(song);

        button.classList.toggle(
          "active",
          active
        );

        button.textContent =
          active
            ? "♥"
            : "♡";
      }
    );
}


/* =========================================
   PLAY SONG
========================================= */

async function playSong(
  song,
  collection = searchResults
) {

  if (!song) {
    return;
  }

  if (!song.streamUrl) {

    alert(
      "This track does not have a playable stream."
    );

    return;
  }

  const collectionIndex =
    collection.findIndex(
      item =>
        String(item.id) ===
        String(song.id)
    );

  if (
    collectionIndex !== -1
  ) {

    searchResults =
      collection;

    currentSongIndex =
      collectionIndex;

  } else {

    searchResults =
      [song];

    currentSongIndex =
      0;
  }

  try {

    audio.pause();

    audio.src =
      song.streamUrl;

    audio.load();

    updatePlayer(
      song
    );

    addRecentlyPlayed(
      song
    );

    updateQueue();

    await audio.play();

    updatePlayButton();

    updateActiveCard();

  } catch (error) {

    console.error(
      "Playback error:",
      error
    );

    showSearchStatus(
      "The song could not be played. Try another track.",
      "error"
    );
  }
}


function togglePlayPause() {

  const song =
    getCurrentSong();

  if (!song) {

    if (
      searchResults.length
    ) {

      playSong(
        searchResults[0]
      );

    } else {

      searchInput.focus();
    }

    return;
  }

  if (
    audio.paused
  ) {

    audio.play()
      .then(
        () => {
          updatePlayButton();
        }
      )
      .catch(
        error =>
          console.error(
            error
          )
      );

  } else {

    audio.pause();

    updatePlayButton();
  }
}


/* =========================================
   PLAYER UI
========================================= */

function updatePlayer(
  song
) {

  if (!song) {
    return;
  }

  nowPlayingTitle.textContent =
    song.title;

  nowPlayingArtist.textContent =
    song.artist;

  setCover(
    miniCover,
    song
  );

  setCover(
    queueCurrentCover,
    song
  );

  queueCurrentTitle.textContent =
    song.title;

  queueCurrentArtist.textContent =
    song.artist;

  timeCurrent.textContent =
    "0:00";

  timeDuration.textContent =
    formatTime(
      song.duration
    );

  progressFill.style.width =
    "0%";
}


function updatePlayButton() {

  playPauseButton.textContent =
    audio.paused
      ? "▶"
      : "❚❚";
}


function updateActiveCard() {

  document
    .querySelectorAll(
      ".music-card"
    )
    .forEach(
      card => {

        const songId =
          card.dataset.songId;

        const currentSong =
          getCurrentSong();

        const active =
          currentSong &&
          String(
            currentSong.id
          ) ===
            String(songId);

        card.classList.toggle(
          "active",
          Boolean(active)
        );
      }
    );
}


function setCover(
  element,
  song
) {

  if (!element) {
    return;
  }

  if (!song?.artwork) {

    element.innerHTML =
      `<div class="album-fallback artwork-one">♪</div>`;

    return;
  }

  element.innerHTML = `
    <img
      src="${escapeHTML(song.artwork)}"
      alt=""
      onerror="this.style.display='none';"
    >
  `;
}


/* =========================================
   NEXT / PREVIOUS
========================================= */

function nextSong() {

  if (!searchResults.length) {
    return;
  }

  if (
    repeatMode === 2
  ) {

    audio.currentTime =
      0;

    audio.play();

    return;
  }

  let nextIndex;

  if (
    shuffleEnabled &&
    searchResults.length > 1
  ) {

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

  } else {

    nextIndex =
      currentSongIndex + 1;

    if (
      nextIndex >=
      searchResults.length
    ) {

      if (
        repeatMode === 1
      ) {

        nextIndex = 0;

      } else {

        audio.pause();

        currentSongIndex =
          searchResults.length - 1;

        updatePlayButton();

        return;
      }
    }
  }

  currentSongIndex =
    nextIndex;

  playSong(
    searchResults[
      currentSongIndex
    ],
    searchResults
  );
}


function previousSong() {

  if (!searchResults.length) {
    return;
  }

  if (
    audio.currentTime > 3
  ) {

    audio.currentTime =
      0;

    return;
  }

  let previousIndex =
    currentSongIndex - 1;

  if (
    previousIndex < 0
  ) {

    previousIndex =
      repeatMode === 1
        ? searchResults.length - 1
        : 0;
  }

  currentSongIndex =
    previousIndex;

  playSong(
    searchResults[
      currentSongIndex
    ],
    searchResults
  );
}


/* =========================================
   QUEUE
========================================= */

function updateQueue() {

  queueList.innerHTML = "";

  if (!searchResults.length) {

    queueList.innerHTML =
      `
        <div class="queue-empty">
          No songs in queue.
        </div>
      `;

    return;
  }

  searchResults.forEach(
    (song, index) => {

      if (
        index ===
        currentSongIndex
      ) {
        return;
      }

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "queue-item";

      item.dataset.index =
        index;

      item.innerHTML = `

        <div class="queue-item-cover">

          ${
            song.artwork
              ? `
                <img
                  src="${escapeHTML(song.artwork)}"
                  alt=""
                >
              `
              : "♪"
          }

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

      queueList.appendChild(
        item
      );
    }
  );
}


function openQueue() {

  queuePanel.classList.add(
    "open"
  );

  queueOverlay.classList.add(
    "open"
  );

  updateQueue();
}


function closeQueue() {

  queuePanel.classList.remove(
    "open"
  );

  queueOverlay.classList.remove(
    "open"
  );
}


/* =========================================
   PLAYLIST SIDEBAR
========================================= */

function renderSidebarPlaylists() {

  sidebarPlaylists.innerHTML = "";

  if (!playlists.length) {

    const empty =
      document.createElement(
        "div"
      );

    empty.style.cssText = `
      padding: 8px 10px;
      color: #69736c;
      font-size: 11px;
    `;

    empty.textContent =
      "No playlists yet";

    sidebarPlaylists.appendChild(
      empty
    );

    return;
  }

  playlists.forEach(
    playlist => {

      const button =
        document.createElement(
          "button"
        );

      button.className =
        "playlist-sidebar-item";

      if (
        currentView ===
          "playlist" &&
        currentPlaylistId ===
          playlist.id
      ) {

        button.classList.add(
          "active"
        );
      }

      button.dataset.playlistId =
        playlist.id;

      const firstSong =
        playlist.songs?.[0];

      const cover =
        firstSong?.artwork
          ? `
            <img
              src="${escapeHTML(firstSong.artwork)}"
              alt=""
              style="
                width:100%;
                height:100%;
                object-fit:cover;
                border-radius:5px;
              "
            >
          `
          : "♫";

      button.innerHTML = `

        <div class="playlist-sidebar-info">

          <div class="playlist-sidebar-cover">
            ${cover}
          </div>

          <span class="playlist-sidebar-name">
            ${escapeHTML(playlist.name)}
          </span>

        </div>

        <span class="playlist-sidebar-count">
          ${playlist.songs?.length || 0}
        </span>

      `;

      sidebarPlaylists.appendChild(
        button
      );
    }
  );
}


/* =========================================
   OPEN PLAYLIST
========================================= */

function openPlaylist(
  playlistId
) {

  const playlist =
    getPlaylistById(
      playlistId
    );

  if (!playlist) {
    return;
  }

  currentView =
    "playlist";

  currentPlaylistId =
    playlistId;

  searchResults =
    playlist.songs || [];

  renderSidebarPlaylists();

  renderCurrentView();
}


/* =========================================
   PLAYLIST MODAL
========================================= */

function openCreatePlaylistModal() {

  playlistNameInput.value =
    "";

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


function closeCreatePlaylistModal() {

  playlistModal.classList.add(
    "hidden"
  );
}


function createPlaylistFromModal() {

  const playlist =
    createPlaylist(
      playlistNameInput.value
    );

  if (!playlist) {

    alert(
      "Please enter a playlist name."
    );

    return;
  }

  closeCreatePlaylistModal();

  openPlaylist(
    playlist.id
  );
}


/* =========================================
   ADD TO PLAYLIST MODAL
========================================= */

function openAddToPlaylistModal(
  song
) {

  if (!song) {
    return;
  }

  currentAddPlaylistSong =
    song;

  addPlaylistSongName.textContent =
    `"${song.title}" by ${song.artist}`;

  renderPlaylistPicker();

  addPlaylistModal.classList.remove(
    "hidden"
  );
}


function closeAddToPlaylistModal() {

  addPlaylistModal.classList.add(
    "hidden"
  );

  currentAddPlaylistSong =
    null;
}


function renderPlaylistPicker() {

  playlistPicker.innerHTML = "";

  if (!playlists.length) {

    playlistPicker.innerHTML = `
      <div
        style="
          padding:18px;
          text-align:center;
          color:#69736c;
          font-size:12px;
        "
      >
        You don't have any playlists yet.
      </div>
    `;

    return;
  }

  playlists.forEach(
    playlist => {

      const button =
        document.createElement(
          "button"
        );

      button.className =
        "playlist-picker-item";

      button.dataset.playlistId =
        playlist.id;

      button.innerHTML = `

        <div class="playlist-picker-cover">
          ♫
        </div>

        <div class="playlist-picker-info">

          <div class="playlist-picker-name">
            ${escapeHTML(playlist.name)}
          </div>

          <div class="playlist-picker-count">
            ${playlist.songs?.length || 0} songs
          </div>

        </div>
      `;

      playlistPicker.appendChild(
        button
      );
    }
  );
}


/* =========================================
   NAVIGATION
========================================= */

function updateNavigation(
  activeSection
) {

  document
    .querySelectorAll(
      ".nav-link"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.section ===
            activeSection
        );
      }
    );
}


function goHome() {

  currentView =
    "home";

  currentPlaylistId =
    null;

  renderCurrentView();

  updateNavigation(
    "home"
  );
}


/* =========================================
   EVENT LISTENERS
========================================= */


/* Search */
searchInput.addEventListener(
  "input",
  () => {

    updateSearchUI();

    clearTimeout(
      searchTimer
    );

    const query =
      searchInput.value.trim();

    if (!query) {

      searchResults = [];

      currentView =
        "home";

      currentPlaylistId =
        null;

      hideSearchStatus();

      renderCurrentView();

      return;
    }

    searchTimer =
      setTimeout(
        () => {

          performSearch(
            query
          );

        },
        450
      );
  }
);


/* Search clear */
clearSearchButton.addEventListener(
  "click",
  () => {

    searchInput.value =
      "";

    updateSearchUI();

    searchResults = [];

    currentView =
      "home";

    currentPlaylistId =
      null;

    hideSearchStatus();

    renderCurrentView();

    searchInput.focus();
  }
);


/* Start Listening */
startButton.addEventListener(
  "click",
  () => {

    searchInput.focus();

    searchInput.value =
      "music";

    updateSearchUI();

    performSearch(
      "music"
    );
  }
);


/* Music card interactions */
musicGrid.addEventListener(
  "click",
  event => {

    const card =
      event.target.closest(
        ".music-card"
      );

    if (!card) {
      return;
    }

    const index =
      Number(
        card.dataset.index
      );

    const song =
      searchResults[index];

    if (!song) {
      return;
    }


    const actionButton =
      event.target.closest(
        "[data-action]"
      );

    if (
      actionButton
    ) {

      const action =
        actionButton.dataset.action;

      if (
        action ===
        "play"
      ) {

        playSong(
          song,
          searchResults
        );

        return;
      }

      if (
        action ===
        "favorite"
      ) {

        toggleFavorite(
          song
        );

        return;
      }

      if (
        action ===
        "playlist"
      ) {

        openAddToPlaylistModal(
          song
        );

        return;
      }
    }


    playSong(
      song,
      searchResults
    );
  }
);


/* Double-click card */
musicGrid.addEventListener(
  "dblclick",
  event => {

    const card =
      event.target.closest(
        ".music-card"
      );

    if (!card) {
      return;
    }

    const index =
      Number(
        card.dataset.index
      );

    const song =
      searchResults[index];

    if (song) {

      playSong(
        song,
        searchResults
      );
    }
  }
);


/* Player */
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


/* Shuffle */
shuffleButton.addEventListener(
  "click",
  () => {

    shuffleEnabled =
      !shuffleEnabled;

    shuffleButton.classList.toggle(
      "active",
      shuffleEnabled
    );
  }
);


/* Repeat */
repeatButton.addEventListener(
  "click",
  () => {

    repeatMode =
      (repeatMode + 1) % 3;

    repeatButton.classList.toggle(
      "active",
      repeatMode !== 0
    );

    if (
      repeatMode === 0
    ) {

      repeatButton.textContent =
        "🔁";

      repeatButton.title =
        "Repeat off";

    } else if (
      repeatMode === 1
    ) {

      repeatButton.textContent =
        "🔁";

      repeatButton.title =
        "Repeat all";

    } else {

      repeatButton.textContent =
        "🔂";

      repeatButton.title =
        "Repeat one";
    }
  }
);


/* Audio events */
audio.addEventListener(
  "play",
  () => {

    updatePlayButton();

    updateActiveCard();
  }
);


audio.addEventListener(
  "pause",
  () => {

    updatePlayButton();
  }
);


audio.addEventListener(
  "loadedmetadata",
  () => {

    timeDuration.textContent =
      formatTime(
        audio.duration
      );
  }
);


audio.addEventListener(
  "timeupdate",
  () => {

    if (
      !Number.isFinite(
        audio.duration
      )
    ) {
      return;
    }

    const percent =
      (
        audio.currentTime /
        audio.duration
      ) * 100;

    progressFill.style.width =
      `${percent}%`;

    timeCurrent.textContent =
      formatTime(
        audio.currentTime
      );
  }
);


audio.addEventListener(
  "ended",
  () => {

    if (
      repeatMode === 2
    ) {

      audio.currentTime =
        0;

      audio.play();

      return;
    }

    nextSong();
  }
);


audio.addEventListener(
  "error",
  () => {

    showSearchStatus(
      "The audio stream could not be loaded. Try another track.",
      "error"
    );

    updatePlayButton();
  }
);


/* Progress */
progressBar.addEventListener(
  "click",
  event => {

    if (
      !Number.isFinite(
        audio.duration
      )
    ) {
      return;
    }

    const rect =
      progressBar.getBoundingClientRect();

    const percentage =
      (
        event.clientX -
        rect.left
      ) /
      rect.width;

    audio.currentTime =
      Math.max(
        0,
        Math.min(
          1,
          percentage
        )
      ) *
      audio.duration;
  }
);


/* Volume */
volumeSlider.addEventListener(
  "input",
  () => {

    const value =
      Number(
        volumeSlider.value
      );

    audio.volume =
      value;

    audio.muted =
      value === 0;

    updateVolumeIcon();
  }
);


volumeIcon.addEventListener(
  "click",
  () => {

    if (audio.muted) {

      audio.muted =
        false;

      if (
        Number(
          volumeSlider.value
        ) === 0
      ) {

        volumeSlider.value =
          "0.8";

        audio.volume =
          0.8;
      }

    } else {

      audio.muted =
        true;
    }

    updateVolumeIcon();
  }
);


function updateVolumeIcon() {

  if (
    audio.muted ||
    audio.volume === 0
  ) {

    volumeIcon.textContent =
      "🔇";

  } else if (
    audio.volume < 0.5
  ) {

    volumeIcon.textContent =
      "🔉";

  } else {

    volumeIcon.textContent =
      "🔊";
  }
}


/* Queue */
queueOpenButton.addEventListener(
  "click",
  openQueue
);

queueCloseButton.addEventListener(
  "click",
  closeQueue
);

queueOverlay.addEventListener(
  "click",
  closeQueue
);


queueList.addEventListener(
  "click",
  event => {

    const item =
      event.target.closest(
        ".queue-item"
      );

    if (!item) {
      return;
    }

    const index =
      Number(
        item.dataset.index
      );

    if (
      !Number.isFinite(index)
    ) {
      return;
    }

    currentSongIndex =
      index;

    playSong(
      searchResults[index],
      searchResults
    );
  }
);


/* Favorites */
favoritesSidebarButton.addEventListener(
  "click",
  () => {

    currentView =
      "favorites";

    currentPlaylistId =
      null;

    renderCurrentView();

    updateNavigation(
      "library"
    );
  }
);


/* Recently played */
recentSidebarButton.addEventListener(
  "click",
  () => {

    currentView =
      "recent";

    currentPlaylistId =
      null;

    renderCurrentView();

    updateNavigation(
      "library"
    );
  }
);


/* Main navigation */
document
  .querySelectorAll(
    ".nav-link"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const section =
            button.dataset.section;

          if (
            section ===
            "home"
          ) {

            goHome();

            return;
          }

          if (
            section ===
            "search"
          ) {

            searchInput.focus();

            updateNavigation(
              "search"
            );

            return;
          }

          if (
            section ===
            "library"
          ) {

            currentView =
              "library";

            currentPlaylistId =
              null;

            renderCurrentView();

            updateNavigation(
              "library"
            );
          }
        }
      );
    }
  );


/* Create playlist */
createPlaylistButton.addEventListener(
  "click",
  openCreatePlaylistModal
);

playlistCreateButton.addEventListener(
  "click",
  createPlaylistFromModal
);

playlistCancelButton.addEventListener(
  "click",
  closeCreatePlaylistModal
);

playlistModalClose.addEventListener(
  "click",
  closeCreatePlaylistModal
);


/* Create playlist from Enter */
playlistNameInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      createPlaylistFromModal();
    }
  }
);


/* Close playlist modal by background */
playlistModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      playlistModal
    ) {

      closeCreatePlaylistModal();
    }
  }
);


/* Add playlist modal */
addPlaylistModalClose.addEventListener(
  "click",
  closeAddToPlaylistModal
);


addPlaylistModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      addPlaylistModal
    ) {

      closeAddToPlaylistModal();
    }
  }
);


/* Playlist picker */
playlistPicker.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".playlist-picker-item"
      );

    if (!button) {
      return;
    }

    const playlistId =
      button.dataset.playlistId;

    const added =
      addSongToPlaylist(
        playlistId,
        currentAddPlaylistSong
      );

    if (added) {

      closeAddToPlaylistModal();

      showSearchStatus(
        `Added "${currentAddPlaylistSong.title}" to your playlist.`
      );
    }
  }
);


/* Create playlist from picker */
createPlaylistFromPicker.addEventListener(
  "click",
  () => {

    closeAddToPlaylistModal();

    openCreatePlaylistModal();
  }
);


/* Sidebar playlists */
sidebarPlaylists.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".playlist-sidebar-item"
      );

    if (!button) {
      return;
    }

    const playlistId =
      button.dataset.playlistId;

    openPlaylist(
      playlistId
    );
  }
);


/* Playlist header right-click menu */
musicGrid.addEventListener(
  "contextmenu",
  event => {

    const card =
      event.target.closest(
        ".music-card"
      );

    if (!card) {
      return;
    }

    if (
      currentView !==
      "playlist"
    ) {
      return;
    }

    event.preventDefault();

    const index =
      Number(
        card.dataset.index
      );

    const song =
      searchResults[index];

    if (!song) {
      return;
    }

    const remove =
      window.confirm(
        `Remove "${song.title}" from "${getPlaylistById(currentPlaylistId)?.name}"?`
      );

    if (remove) {

      removeSongFromPlaylist(
        currentPlaylistId,
        song.id
      );
    }
  }
);


/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener(
  "keydown",
  event => {

    const tag =
      document.activeElement?.tagName;

    const typing =
      tag === "INPUT" ||
      tag === "TEXTAREA";

    if (
      event.code ===
      "Space" &&
      !typing
    ) {

      event.preventDefault();

      togglePlayPause();

      return;
    }

    if (
      event.key.toLowerCase() ===
      "m" &&
      !typing
    ) {

      event.preventDefault();

      volumeIcon.click();

      return;
    }

    if (
      event.key.toLowerCase() ===
      "s" &&
      !typing
    ) {

      event.preventDefault();

      shuffleButton.click();

      return;
    }

    if (
      event.key.toLowerCase() ===
      "r" &&
      !typing
    ) {

      event.preventDefault();

      repeatButton.click();

      return;
    }

    if (
      event.key ===
      "ArrowRight" &&
      !typing
    ) {

      event.preventDefault();

      nextSong();

      return;
    }

    if (
      event.key ===
      "ArrowLeft" &&
      !typing
    ) {

      event.preventDefault();

      previousSong();

      return;
    }

    if (
      event.key ===
      "Escape"
    ) {

      closeQueue();

      closeCreatePlaylistModal();

      closeAddToPlaylistModal();
    }
  }
);


/* =========================================
   INITIALIZATION
========================================= */

function initialize() {

  renderSidebarPlaylists();

  renderCurrentView();

  updatePlayButton();

  updateVolumeIcon();

  updateSearchUI();

  shuffleButton.classList.remove(
    "active"
  );

  repeatButton.classList.remove(
    "active"
  );

  console.log(
    "🎵 RedWave + Jamendo Music System Ready"
  );

  console.log(
    `Client ID configured: ${JAMENDO_CLIENT_ID ? "YES" : "NO"}`
  );

  console.log(
    `Saved playlists: ${playlists.length}`
  );
}


initialize();