/* =========================================
   REDWAVE MUSIC PLAYER
   YouTube Search + YouTube Player
   Favorites + Playlists + Queue
========================================= */


/* =========================================
   CONFIGURATION
========================================= */

const YOUTUBE_API_KEY = "AIzaSyDwK6p9mcWbkS446vAfwOp8X2iefo0rk80";

const YOUTUBE_SEARCH_API =
  "https://www.googleapis.com/youtube/v3/search";

const STORAGE_KEYS = {
  favorites: "redwave-favorites",
  recentlyPlayed: "redwave-recently-played",
  playlists: "redwave-playlists"
};


/* =========================================
   YOUTUBE PLAYER
========================================= */

let youtubePlayer = null;
let youtubeApiReady = false;
let youtubePlayerReady = false;
let youtubePlayerLoading = false;
let progressTimer = null;


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

let searchTimer = null;

let activeSearchController = null;


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
      favorites =
        favorites.slice(0, 500);
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
    recentlyPlayed.slice(0, 50);

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
   YOUTUBE API LOADER
========================================= */

function loadYouTubeAPI() {

  if (youtubeApiReady) {
    return;
  }

  if (
    document.querySelector(
      'script[data-redwave-youtube-api]'
    )
  ) {
    return;
  }

  window.onYouTubeIframeAPIReady =
    function () {

      youtubeApiReady = true;

      createYouTubePlayer();
    };

  const script =
    document.createElement(
      "script"
    );

  script.src =
    "https://www.youtube.com/iframe_api";

  script.async = true;

  script.dataset.redwaveYoutubeApi =
    "true";

  document.head.appendChild(
    script
  );
}


/* =========================================
   YOUTUBE PLAYER CONTAINER
========================================= */

function createYouTubePlayerContainer() {

  let container =
    document.getElementById(
      "redwaveYouTubePlayer"
    );

  if (container) {
    return container;
  }

  container =
    document.createElement(
      "div"
    );

  container.id =
    "redwaveYouTubePlayer";

  container.innerHTML = `
    <div class="redwave-youtube-header">
      <span>YouTube Player</span>

      <button
        type="button"
        id="redwaveYouTubeClose"
        title="Minimize player"
      >
        −
      </button>
    </div>

    <div
      id="redwaveYouTubeFrame"
      class="redwave-youtube-frame"
    ></div>
  `;

  document.body.appendChild(
    container
  );

  injectYouTubePlayerStyles();

  const closeButton =
    document.getElementById(
      "redwaveYouTubeClose"
    );

  closeButton.addEventListener(
    "click",
    () => {

      container.classList.toggle(
        "minimized"
      );
    }
  );

  return container;
}


function injectYouTubePlayerStyles() {

  if (
    document.getElementById(
      "redwaveYouTubeStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "redwaveYouTubeStyles";

  style.textContent = `
    #redwaveYouTubePlayer {
      position: fixed;
      right: 18px;
      bottom: 108px;
      width: 360px;
      background: #101512;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 18px 50px rgba(0,0,0,0.45);
      z-index: 900;
      transition: all 0.25s ease;
    }

    #redwaveYouTubePlayer.minimized {
      width: 190px;
    }

    #redwaveYouTubePlayer.minimized
    .redwave-youtube-frame {
      height: 0;
      opacity: 0;
    }

    .redwave-youtube-header {
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px 0 13px;
      color: #e9f2ec;
      background: #151b17;
      font-size: 12px;
      font-weight: 700;
    }

    .redwave-youtube-header button {
      border: 0;
      background: transparent;
      color: #9aa59e;
      font-size: 20px;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 7px;
    }

    .redwave-youtube-header button:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }

    .redwave-youtube-frame {
      width: 100%;
      height: 202px;
      background: #000;
      transition: all 0.25s ease;
    }

    .redwave-youtube-frame iframe {
      width: 100% !important;
      height: 100% !important;
    }

    @media (max-width: 600px) {
      #redwaveYouTubePlayer {
        left: 10px;
        right: 10px;
        bottom: 100px;
        width: auto;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}


/* =========================================
   CREATE YOUTUBE PLAYER
========================================= */

function createYouTubePlayer() {

  if (
    youtubePlayer ||
    !window.YT
  ) {
    return;
  }

  const container =
    createYouTubePlayerContainer();

  const frame =
    document.getElementById(
      "redwaveYouTubeFrame"
    );

  youtubePlayer =
    new YT.Player(
      frame,
      {
        width: "100%",
        height: "202",

        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin:
            window.location.origin
        },

        events: {
          onReady:
            onYouTubePlayerReady,

          onStateChange:
            onYouTubePlayerStateChange,

          onError:
            onYouTubePlayerError
        }
      }
    );

  container.classList.remove(
    "minimized"
  );
}


function onYouTubePlayerReady() {

  youtubePlayerReady = true;

  youtubePlayer.setVolume(
    Number(volumeSlider.value) * 100
  );

  updatePlayButton();

  console.log(
    "🎬 RedWave YouTube Player Ready"
  );
}


function onYouTubePlayerStateChange(
  event
) {

  if (!window.YT) {
    return;
  }

  const state =
    event.data;

  if (
    state ===
    YT.PlayerState.PLAYING
  ) {

    youtubePlayerLoading = false;

    updatePlayButton();

    updateActiveCard();

    startProgressTimer();

  } else if (
    state ===
    YT.PlayerState.PAUSED
  ) {

    updatePlayButton();

    stopProgressTimer();

  } else if (
    state ===
    YT.PlayerState.ENDED
  ) {

    stopProgressTimer();

    handleSongEnded();

  } else if (
    state ===
    YT.PlayerState.BUFFERING
  ) {

    youtubePlayerLoading = true;

  } else {

    updatePlayButton();
  }
}


function onYouTubePlayerError(
  event
) {

  console.error(
    "YouTube Player Error:",
    event.data
  );

  youtubePlayerLoading = false;

  updatePlayButton();

  let message =
    "This YouTube video cannot be played here.";

  if (
    event.data === 101 ||
    event.data === 150
  ) {
    message =
      "This video does not allow playback on embedded players. Try another result.";
  }

  if (
    event.data === 100
  ) {
    message =
      "This YouTube video is unavailable. Try another result.";
  }

  showSearchStatus(
    message,
    "error"
  );
}


/* =========================================
   SEARCH YOUTUBE
========================================= */

async function searchYouTube(
  query,
  signal
) {

  const trimmed =
    String(query || "")
      .trim();

  if (
    !trimmed ||
    trimmed.length < 2
  ) {
    return [];
  }

  if (
    !YOUTUBE_API_KEY ||
    YOUTUBE_API_KEY ===
      "YOUR_YOUTUBE_API_KEY_HERE"
  ) {

    throw new Error(
      "YouTube API key has not been configured."
    );
  }

  const params =
    new URLSearchParams();

  params.set(
    "part",
    "snippet"
  );

  params.set(
    "q",
    trimmed
  );

  params.set(
    "type",
    "video"
  );

  params.set(
    "maxResults",
    "24"
  );

  params.set(
    "videoEmbeddable",
    "true"
  );

  params.set(
    "videoSyndicated",
    "true"
  );

  params.set(
    "order",
    "relevance"
  );

  params.set(
    "key",
    YOUTUBE_API_KEY
  );

  const response =
    await fetch(
      `${YOUTUBE_SEARCH_API}?${params.toString()}`,
      {
        signal
      }
    );

  if (!response.ok) {

    let errorMessage =
      `YouTube request failed: ${response.status}`;

    try {

      const errorData =
        await response.json();

      const apiMessage =
        errorData?.error?.message;

      if (apiMessage) {
        errorMessage =
          apiMessage;
      }

    } catch {
      /* Ignore JSON parsing failure */
    }

    throw new Error(
      errorMessage
    );
  }

  const data =
    await response.json();

  return (
    data.items || []
  )
    .filter(
      item =>
        item?.id?.videoId
    )
    .map(
      normalizeYouTubeSong
    );
}


/* =========================================
   NORMALIZE YOUTUBE RESULT
========================================= */

function normalizeYouTubeSong(
  item
) {

  const snippet =
    item.snippet || {};

  const thumbnails =
    snippet.thumbnails || {};

  const thumbnail =
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    "";

  return {

    id:
      `youtube-${item.id.videoId}`,

    videoId:
      item.id.videoId,

    title:
      cleanYouTubeTitle(
        snippet.title ||
        "Unknown Song"
      ),

    artist:
      snippet.channelTitle ||
      "YouTube",

    album:
      "YouTube",

    duration:
      0,

    artwork:
      thumbnail,

    streamUrl:
      "",

    sourceUrl:
      `https://www.youtube.com/watch?v=${encodeURIComponent(
        item.id.videoId
      )}`,

    source:
      "YouTube",

    publishedAt:
      snippet.publishedAt ||
      ""
  };
}


/* =========================================
   CLEAN YOUTUBE TITLES
========================================= */

function cleanYouTubeTitle(
  title
) {

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.innerHTML =
    title || "";

  return textarea.value;
}


/* =========================================
   SEARCH RANKING
========================================= */

function rankYouTubeResults(
  results,
  query
) {

  const normalizedQuery =
    normalizeSearchText(
      query
    );

  const words =
    normalizedQuery
      .split(/\s+/)
      .filter(Boolean);

  return results
    .map(
      (song, index) => {

        const title =
          normalizeSearchText(
            song.title
          );

        const artist =
          normalizeSearchText(
            song.artist
          );

        let score = 0;

        if (
          title ===
          normalizedQuery
        ) {
          score += 1000;
        }

        if (
          title.startsWith(
            normalizedQuery
          )
        ) {
          score += 500;
        }

        if (
          artist.startsWith(
            normalizedQuery
          )
        ) {
          score += 400;
        }

        if (
          title.includes(
            normalizedQuery
          )
        ) {
          score += 250;
        }

        if (
          artist.includes(
            normalizedQuery
          )
        ) {
          score += 150;
        }

        words.forEach(
          word => {

            if (
              title.includes(word)
            ) {
              score += 35;
            }

            if (
              artist.includes(word)
            ) {
              score += 25;
            }
          }
        );

        const versionWords = [
          "slowed",
          "reverb",
          "remix",
          "nightcore",
          "sped up",
          "speed up",
          "lofi",
          "bass boosted",
          "8d",
          "cover",
          "live",
          "acoustic",
          "instrumental",
          "official"
        ];

        versionWords.forEach(
          version => {

            if (
              title.includes(version) &&
              normalizedQuery.includes(version)
            ) {
              score += 80;
            }
          }
        );

        score -=
          index * 0.1;

        return {
          song,
          score
        };
      }
    )
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .map(
      item =>
        item.song
    );
}


function normalizeSearchText(
  value
) {

  return String(value || "")
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


/* =========================================
   REMOVE DUPLICATES
========================================= */

function deduplicateSongs(
  songs
) {

  const seen =
    new Set();

  return songs.filter(
    song => {

      const key =
        String(
          song.videoId ||
          song.id
        );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}


/* =========================================
   SEARCH UI
========================================= */

function updateSearchUI() {

  const hasText =
    searchInput.value
      .trim()
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


/* =========================================
   PERFORM SEARCH
========================================= */

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

  if (trimmed.length < 2) {

    searchResults = [];

    currentView = "home";

    hideSearchStatus();

    renderCurrentView();

    return;
  }

  const requestId =
    ++lastSearchRequest;

  if (activeSearchController) {
    activeSearchController.abort();
  }

  activeSearchController =
    new AbortController();

  const controller =
    activeSearchController;

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
    `Searching YouTube for "${trimmed}"...`,
    "loading"
  );

  renderCurrentView();

  try {

    let results =
      await searchYouTube(
        trimmed,
        controller.signal
      );

    if (
      requestId !==
      lastSearchRequest
    ) {
      return;
    }

    results =
      rankYouTubeResults(
        results,
        trimmed
      );

    results =
      deduplicateSongs(
        results
      );

    searchResults =
      results;

    isLoadingSearch = false;

    if (!results.length) {

      showSearchStatus(
        `No YouTube results found for "${trimmed}".`
      );

      renderCurrentView();

      return;
    }

    showSearchStatus(
      `Found ${results.length} results for "${trimmed}".`
    );

    renderCurrentView();

  } catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      "YouTube search error:",
      error
    );

    isLoadingSearch = false;

    searchResults = [];

    let message =
      "Could not search YouTube. Please try again.";

    if (
      error?.message?.includes(
        "API key"
      )
    ) {
      message =
        "YouTube API key is not configured in script.js.";
    }

    if (
      error?.message?.includes(
        "quota"
      )
    ) {
      message =
        "YouTube API quota has been reached. Please try again later.";
    }

    showSearchStatus(
      message,
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

      const currentSong =
        getCurrentSong();

      if (
        currentSong &&
        String(
          currentSong.id
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
            title="Play on YouTube"
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
            YouTube
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
    currentView ===
    "favorites"
  ) {

    renderFavoritesView();

    return;
  }

  if (
    currentView ===
    "recent"
  ) {

    renderRecentView();

    return;
  }

  if (
    currentView ===
    "playlist"
  ) {

    renderPlaylistView();

    return;
  }

  if (
    currentView ===
    "library"
  ) {

    renderLibraryView();

    return;
  }

  if (
    currentView ===
    "search"
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
      "Searching YouTube...";

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

    const heading =
      emptyRecent.querySelector(
        "h3"
      );

    const paragraph =
      emptyRecent.querySelector(
        "p"
      );

    if (heading) {
      heading.textContent =
        "Your library is empty";
    }

    if (paragraph) {
      paragraph.textContent =
        "Search for music and like songs to build your library.";
    }

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

function playSong(
  song,
  collection = searchResults
) {

  if (!song) {
    return;
  }

  if (!song.videoId) {

    alert(
      "This song does not have a YouTube video ID."
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

  updatePlayer(
    song
  );

  addRecentlyPlayed(
    song
  );

  updateQueue();

  updateActiveCard();

  const container =
    createYouTubePlayerContainer();

  container.classList.remove(
    "minimized"
  );

  if (!youtubeApiReady) {

    showSearchStatus(
      "Loading YouTube player...",
      "loading"
    );

    loadYouTubeAPI();

    waitForYouTubePlayer(
      song.videoId
    );

    return;
  }

  if (!youtubePlayer) {

    createYouTubePlayer();

    waitForYouTubePlayer(
      song.videoId
    );

    return;
  }

  if (!youtubePlayerReady) {

    waitForYouTubePlayer(
      song.videoId
    );

    return;
  }

  loadVideoIntoPlayer(
    song.videoId
  );
}


function waitForYouTubePlayer(
  videoId
) {

  const start =
    Date.now();

  const timeout =
    10000;

  const check =
    setInterval(
      () => {

        if (
          youtubePlayer &&
          youtubePlayerReady
        ) {

          clearInterval(
            check
          );

          loadVideoIntoPlayer(
            videoId
          );

          return;
        }

        if (
          Date.now() - start >
          timeout
        ) {

          clearInterval(
            check
          );

          showSearchStatus(
            "YouTube player took too long to load. Please try again.",
            "error"
          );
        }

      },
      100
    );
}


function loadVideoIntoPlayer(
  videoId
) {

  if (
    !youtubePlayer ||
    !youtubePlayerReady
  ) {
    return;
  }

  youtubePlayerLoading =
    true;

  try {

    youtubePlayer.loadVideoById(
      videoId
    );

  } catch (error) {

    console.error(
      "Could not load YouTube video:",
      error
    );
  }
}


/* =========================================
   PLAY / PAUSE
========================================= */

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
    !youtubePlayer ||
    !youtubePlayerReady
  ) {

    playSong(
      song,
      searchResults
    );

    return;
  }

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
    "0:00";

  progressFill.style.width =
    "0%";
}


function updatePlayButton() {

  if (
    !youtubePlayer ||
    !youtubePlayerReady ||
    !window.YT
  ) {

    playPauseButton.textContent =
      "▶";

    return;
  }

  const state =
    youtubePlayer.getPlayerState();

  playPauseButton.textContent =
    state ===
    YT.PlayerState.PLAYING
      ? "❚❚"
      : "▶";
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
   PROGRESS TIMER
========================================= */

function startProgressTimer() {

  stopProgressTimer();

  progressTimer =
    setInterval(
      updateProgress,
      500
    );

  updateProgress();
}


function stopProgressTimer() {

  if (progressTimer) {

    clearInterval(
      progressTimer
    );

    progressTimer =
      null;
  }
}


function updateProgress() {

  if (
    !youtubePlayer ||
    !youtubePlayerReady
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

  } catch {
    return;
  }

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return;
  }

  const percent =
    (current / duration) * 100;

  progressFill.style.width =
    `${Math.max(
      0,
      Math.min(
        100,
        percent
      )
    )}%`;

  timeCurrent.textContent =
    formatTime(current);

  timeDuration.textContent =
    formatTime(duration);
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

    if (
      youtubePlayer &&
      youtubePlayerReady
    ) {

      youtubePlayer.seekTo(
        0,
        true
      );

      youtubePlayer.playVideo();
    }

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

        if (
          youtubePlayer &&
          youtubePlayerReady
        ) {
          youtubePlayer.pauseVideo();
        }

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

  let currentTime = 0;

  if (
    youtubePlayer &&
    youtubePlayerReady
  ) {

    try {
      currentTime =
        youtubePlayer.getCurrentTime();
    } catch {
      currentTime = 0;
    }
  }

  if (
    currentTime > 3
  ) {

    youtubePlayer.seekTo(
      0,
      true
    );

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
   SONG ENDED
========================================= */

function handleSongEnded() {

  if (
    repeatMode === 2
  ) {

    if (
      youtubePlayer &&
      youtubePlayerReady
    ) {

      youtubePlayer.seekTo(
        0,
        true
      );

      youtubePlayer.playVideo();
    }

    return;
  }

  nextSong();
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

  playlistPicker.innerHTML =
    "";

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

      if (activeSearchController) {
        activeSearchController.abort();
      }

      searchResults = [];

      currentView =
        "home";

      currentPlaylistId =
        null;

      hideSearchStatus();

      renderCurrentView();

      return;
    }

    if (query.length < 2) {

      if (activeSearchController) {
        activeSearchController.abort();
      }

      searchResults = [];

      currentView =
        "search";

      showSearchStatus(
        "Type at least 2 characters to search..."
      );

      renderCurrentView();

      return;
    }

    currentView =
      "search";

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

    if (activeSearchController) {
      activeSearchController.abort();
    }

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


/* =========================================
   MUSIC CARD INTERACTIONS
========================================= */

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


/* =========================================
   PLAYER CONTROLS
========================================= */

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


/* =========================================
   SHUFFLE
========================================= */

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


/* =========================================
   REPEAT
========================================= */

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


/* =========================================
   PROGRESS
========================================= */

progressBar.addEventListener(
  "click",
  event => {

    if (
      !youtubePlayer ||
      !youtubePlayerReady
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

    const rect =
      progressBar.getBoundingClientRect();

    const percentage =
      (
        event.clientX -
        rect.left
      ) /
      rect.width;

    const safePercentage =
      Math.max(
        0,
        Math.min(
          1,
          percentage
        )
      );

    youtubePlayer.seekTo(
      safePercentage *
        duration,
      true
    );

    updateProgress();
  }
);


/* =========================================
   VOLUME
========================================= */

volumeSlider.addEventListener(
  "input",
  () => {

    const value =
      Number(
        volumeSlider.value
      );

    if (
      youtubePlayer &&
      youtubePlayerReady
    ) {

      youtubePlayer.setVolume(
        value * 100
      );

      if (
        value === 0
      ) {

        youtubePlayer.mute();

      } else {

        youtubePlayer.unMute();
      }
    }

    updateVolumeIcon();
  }
);


volumeIcon.addEventListener(
  "click",
  () => {

    if (
      youtubePlayer &&
      youtubePlayerReady
    ) {

      if (
        youtubePlayer.isMuted()
      ) {

        youtubePlayer.unMute();

        if (
          Number(
            volumeSlider.value
          ) === 0
        ) {

          volumeSlider.value =
            "0.8";

          youtubePlayer.setVolume(
            80
          );
        }

      } else {

        youtubePlayer.mute();
      }

    } else {

      if (
        Number(
          volumeSlider.value
        ) === 0
      ) {

        volumeSlider.value =
          "0.8";

      } else {

        volumeSlider.value =
          "0";
      }
    }

    updateVolumeIcon();
  }
);


function updateVolumeIcon() {

  let muted = false;

  let volume =
    Number(
      volumeSlider.value
    );

  if (
    youtubePlayer &&
    youtubePlayerReady
  ) {

    try {

      muted =
        youtubePlayer.isMuted();

      volume =
        youtubePlayer.getVolume() /
        100;

    } catch {
      /* Use slider value */
    }
  }

  if (
    muted ||
    volume <= 0
  ) {

    volumeIcon.textContent =
      "🔇";

  } else if (
    volume < 0.5
  ) {

    volumeIcon.textContent =
      "🔉";

  } else {

    volumeIcon.textContent =
      "🔊";
  }
}


/* =========================================
   QUEUE
========================================= */

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


/* =========================================
   FAVORITES
========================================= */

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


/* =========================================
   RECENTLY PLAYED
========================================= */

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


/* =========================================
   MAIN NAVIGATION
========================================= */

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


/* =========================================
   CREATE PLAYLIST
========================================= */

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


/* =========================================
   CREATE PLAYLIST ENTER
========================================= */

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


/* =========================================
   CLOSE PLAYLIST MODAL
========================================= */

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


/* =========================================
   ADD PLAYLIST MODAL
========================================= */

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


/* =========================================
   PLAYLIST PICKER
========================================= */

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

      const songTitle =
        currentAddPlaylistSong.title;

      closeAddToPlaylistModal();

      showSearchStatus(
        `Added "${songTitle}" to your playlist.`
      );
    }
  }
);


/* =========================================
   CREATE PLAYLIST FROM PICKER
========================================= */

createPlaylistFromPicker.addEventListener(
  "click",
  () => {

    closeAddToPlaylistModal();

    openCreatePlaylistModal();
  }
);


/* =========================================
   SIDEBAR PLAYLISTS
========================================= */

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


/* =========================================
   PLAYLIST RIGHT CLICK
========================================= */

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

    const playlist =
      getPlaylistById(
        currentPlaylistId
      );

    const remove =
      window.confirm(
        `Remove "${song.title}" from "${playlist?.name}"?`
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

  repeatButton.textContent =
    "🔁";

  repeatButton.title =
    "Repeat off";

  createYouTubePlayerContainer();

  loadYouTubeAPI();

  console.log(
    "🎵 RedWave + YouTube Music System Ready"
  );

  console.log(
    `YouTube API key configured: ${
      YOUTUBE_API_KEY &&
      YOUTUBE_API_KEY !==
        "YOUR_YOUTUBE_API_KEY_HERE"
        ? "YES"
        : "NO"
    }`
  );

  console.log(
    `Saved playlists: ${playlists.length}`
  );
}


initialize();
