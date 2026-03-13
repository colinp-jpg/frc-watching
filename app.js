// The Blue Alliance API configuration
const TBA_API_BASE = 'https://www.thebluealliance.com/api/v3';
const STATBOTICS_API_BASE = 'https://api.statbotics.io/v3';

// Default API key - replace with your TBA API key
const DEFAULT_API_KEY = '2trJHZUlMgArr2CnBiKhc5wxYsdv1aNpZOOcw6BBeZCNQPN7cGeVyiSYjLfmZId7 ';

// Global state
let allMatches = [];
let filteredMatches = [];
let currentMatch = null;
let currentMatchIndex = 0;
let currentVideoIndex = 0;
let ytPlayer = null;
let apiKey = localStorage.getItem('tba_api_key') || DEFAULT_API_KEY;
let eventKey = localStorage.getItem('tba_event_key') || '';
let fmaEvents = [];
let selectedYear = localStorage.getItem('tba_selected_year') || '2026';

// Get current origin for YouTube security handshake
const CURRENT_ORIGIN = window.location.origin === 'null' || window.location.protocol === 'file:' 
    ? 'https://www.youtube.com' 
    : window.location.origin;

// DOM elements
const elements = {
    yearSelect: document.getElementById('yearSelect'),
    districtSelect: document.getElementById('districtSelect'),
    weekSelect: document.getElementById('weekSelect'),
    loadEventsButton: document.getElementById('loadEvents'),
    eventSelectorGroup: document.getElementById('eventSelectorGroup'),
    eventSelect: document.getElementById('eventSelect'),
    eventCount: document.getElementById('eventCount'),
    eventKeyInput: document.getElementById('eventKey'),
    apiKeyInput: document.getElementById('apiKey'),
    loadButton: document.getElementById('loadMatches'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    stats: document.getElementById('stats'),
    matchCount: document.getElementById('matchCount'),
    videoCount: document.getElementById('videoCount'),
    filters: document.getElementById('filters'),
    teamSearch: document.getElementById('teamSearch'),
    videoFilter: document.getElementById('videoFilter'),
    matchType: document.getElementById('matchType'),
    matchList: document.getElementById('matchList'),
    videoPlayer: document.getElementById('videoPlayer'),
    currentMatchTitle: document.getElementById('currentMatchTitle'),
    closePlayer: document.getElementById('closePlayer'),
    videoCounter: document.getElementById('videoCounter'),
    prevVideo: document.getElementById('prevVideo'),
    nextVideo: document.getElementById('nextVideo')
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    // Load saved values
    if (apiKey) elements.apiKeyInput.value = apiKey;
    if (eventKey) elements.eventKeyInput.value = eventKey;
    if (selectedYear) elements.yearSelect.value = selectedYear;
    
    // Event listeners
    elements.loadEventsButton.addEventListener('click', loadFMAEvents);
    elements.eventSelect.addEventListener('change', onEventSelected);
    elements.loadButton.addEventListener('click', loadMatches);
    elements.closePlayer.addEventListener('click', closeVideoPlayer);
    elements.prevVideo.addEventListener('click', () => navigateVideo(-1));
    elements.nextVideo.addEventListener('click', () => navigateVideo(1));
    elements.teamSearch.addEventListener('input', filterMatches);
    elements.videoFilter.addEventListener('change', filterMatches);
    elements.matchType.addEventListener('change', filterMatches);
    
    // Close video from rotate message (mobile portrait)
    const closeFromRotateBtn = document.getElementById('closeFromRotate');
    if (closeFromRotateBtn) {
        closeFromRotateBtn.addEventListener('click', closeVideoPlayer);
    }
    
    // Close video when user exits fullscreen (e.g., pressing back button on Android)
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && elements.videoPlayer.style.display === 'block') {
            closeVideoPlayer();
        }
    });
    document.addEventListener('webkitfullscreenchange', () => {
        if (!document.webkitFullscreenElement && elements.videoPlayer.style.display === 'block') {
            closeVideoPlayer();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (elements.videoPlayer.style.display === 'block') {
            if (e.key === 'Escape') closeVideoPlayer();
            if (e.key === 'ArrowLeft') navigateVideo(-1);
            if (e.key === 'ArrowRight') navigateVideo(1);
        }
    });
});

// YouTube API ready
function onYouTubeIframeAPIReady() {
    console.log('YouTube API ready');
}

// Load events for selected year with optional district and week filters
async function loadFMAEvents() {
    const key = apiKey || elements.apiKeyInput.value.trim();
    const year = elements.yearSelect.value;
    const district = elements.districtSelect.value;
    const week = elements.weekSelect.value;
    
    if (!key) {
        showError('API key not configured');
        return;
    }
    
    localStorage.setItem('tba_selected_year', year);
    selectedYear = year;
    
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch(`${TBA_API_BASE}/events/${year}`, {
            headers: { 'X-TBA-Auth-Key': key }
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const allEvents = await response.json();
        
        // Filter events based on district and week
        let filteredEvents = allEvents;
        
        if (district === 'regional') {
            // Regional events have no district
            filteredEvents = filteredEvents.filter(event => 
                !event.district && event.event_type === 0
            );
        } else if (district) {
            // Filter by specific district
            filteredEvents = filteredEvents.filter(event => 
                event.district?.abbreviation === district
            );
        }
        
        // Filter by week if specified
        if (week !== '') {
            filteredEvents = filteredEvents.filter(event => 
                event.week !== null && event.week === parseInt(week)
            );
        }
        
        // Sort by start date
        fmaEvents = filteredEvents.sort((a, b) => 
            new Date(a.start_date) - new Date(b.start_date)
        );
        
        if (fmaEvents.length === 0) {
            const filterDesc = district === 'regional' ? 'regional events' : 
                              district ? `${district.toUpperCase()} district events` : 'events';
            const weekDesc = week !== '' ? ` in week ${week}` : '';
            showError(`No ${filterDesc}${weekDesc} found for ${year}`);
            elements.eventSelectorGroup.style.display = 'none';
            return;
        }
        
        elements.eventSelect.innerHTML = '<option value="">-- Select an event --</option>';
        fmaEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.key;
            const date = new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const districtLabel = event.district ? `[${event.district.abbreviation.toUpperCase()}]` : '[Regional]';
            const weekLabel = event.week !== null ? `Week ${event.week + 1}` : '';
            option.textContent = `${event.name} ${districtLabel} (${date}) ${weekLabel}`;
            elements.eventSelect.appendChild(option);
        });
        
        elements.eventSelectorGroup.style.display = 'block';
        const filterDesc = district === 'regional' ? 'regional events' : 
                          district ? `${district.toUpperCase()} events` : 'events';
        elements.eventCount.textContent = `${fmaEvents.length} ${filterDesc} found`;
    } catch (error) {
        showError(`Error loading events: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function onEventSelected() {
    const selectedKey = elements.eventSelect.value;
    if (selectedKey) {
        elements.eventKeyInput.value = selectedKey;
        eventKey = selectedKey;
        localStorage.setItem('tba_event_key', selectedKey);
    }
}

async function loadMatches() {
    const key = elements.apiKeyInput.value.trim();
    const event = elements.eventKeyInput.value.trim();
    
    if (!key || !event) {
        showError('Please enter both API key and event key');
        return;
    }
    
    localStorage.setItem('tba_api_key', key);
    localStorage.setItem('tba_event_key', event);
    apiKey = key;
    eventKey = event;
    
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch(`${TBA_API_BASE}/event/${event}/matches`, {
            headers: { 'X-TBA-Auth-Key': key }
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const matches = await response.json();
        if (!matches || matches.length === 0) throw new Error('No matches found');
        
        // Sort by competition level order and match number
        const compLevelOrder = { 'qm': 1, 'ef': 2, 'qf': 3, 'sf': 4, 'f': 5 };
        allMatches = matches.sort((a, b) => {
            // First sort by competition level (quals, quarters, semis, finals)
            const aLevel = compLevelOrder[a.comp_level] || 99;
            const bLevel = compLevelOrder[b.comp_level] || 99;
            if (aLevel !== bLevel) return aLevel - bLevel;
            
            // For elimination matches, sort by set number first
            if (a.comp_level !== 'qm' && a.comp_level !== 'f') {
                if ((a.set_number || 0) !== (b.set_number || 0)) {
                    return (a.set_number || 0) - (b.set_number || 0);
                }
            }
            
            // Then sort by match number within the same level/set
            return a.match_number - b.match_number;
        });
        displayMatches();
        updateStats();
        
        elements.stats.style.display = 'flex';
        elements.filters.style.display = 'flex';
    } catch (error) {
        showError(`Error loading matches: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function displayMatches() {
    const videoOnly = elements.videoFilter.checked;
    const matchType = elements.matchType.value;
    const teamSearch = elements.teamSearch.value.trim();
    
    filteredMatches = allMatches.filter(match => {
        if (videoOnly && (!match.videos || match.videos.length === 0)) return false;
        if (matchType !== 'all' && match.comp_level !== matchType) return false;
        
        // Filter by team number
        if (teamSearch) {
            const searchTeam = 'frc' + teamSearch;
            const allTeams = [
                ...(match.alliances?.red?.team_keys || []),
                ...(match.alliances?.blue?.team_keys || [])
            ];
            if (!allTeams.includes(searchTeam)) return false;
        }
        
        return true;
    });
    
    elements.matchList.innerHTML = '';
    if (filteredMatches.length === 0) {
        elements.matchList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-light);">No matches found</p>';
        return;
    }
    
    filteredMatches.forEach(match => elements.matchList.appendChild(createMatchCard(match)));
}

function createMatchCard(match) {
    const div = document.createElement('div');
    div.className = `match-card ${(!match.videos || match.videos.length === 0) ? 'no-video' : ''}`;
    
    const hasVideos = match.videos && match.videos.length > 0;
    const redAlliance = match.alliances?.red?.team_keys || [];
    const blueAlliance = match.alliances?.blue?.team_keys || [];
    
    div.innerHTML = `
        <div class="match-header">
            <h3>${getMatchName(match)}</h3>
            <div class="match-type">${getMatchTypeName(match.comp_level)}</div>
        </div>
        <div class="match-body">
            <div class="teams">
                <div class="alliance red">
                    <h4>Red Alliance</h4>
                    <ul class="team-list">${redAlliance.map(team => `<li>${formatTeamNumber(team)}</li>`).join('')}</ul>
                </div>
                <div class="alliance blue">
                    <h4>Blue Alliance</h4>
                    <ul class="team-list">${blueAlliance.map(team => `<li>${formatTeamNumber(team)}</li>`).join('')}</ul>
                </div>
            </div>
            <div class="scores">
                <span class="red-score">${match.alliances?.red?.score || 0}</span>
                <span>-</span>
                <span class="blue-score">${match.alliances?.blue?.score || 0}</span>
            </div>
            <div class="video-info">
                <span class="video-badge ${!hasVideos ? 'no-video-badge' : ''}">
                    ${hasVideos ? `📹 ${match.videos.length} Video${match.videos.length > 1 ? 's' : ''}` : 'No Videos'}
                </span>
            </div>
        </div>
    `;
    
    if (hasVideos) div.addEventListener('click', () => openVideoPlayer(match));
    return div;
}

function openVideoPlayer(match) {
    if (!match.videos || match.videos.length === 0) return;
    currentMatch = match;
    currentMatchIndex = filteredMatches.findIndex(m => m.key === match.key);
    currentVideoIndex = 0;
    elements.currentMatchTitle.textContent = getMatchName(match);
    elements.videoPlayer.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Lock screen orientation to landscape on mobile
    lockOrientation();
    
    // Request fullscreen on mobile devices
    requestFullscreen();
    
    loadVideo(false);
    displayMatchDetails();
}

function closeVideoPlayer() {
    elements.videoPlayer.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Exit fullscreen if active
    exitFullscreen();
    
    // Unlock screen orientation
    unlockOrientation();
    
    if (ytPlayer) {
        ytPlayer.destroy();
        ytPlayer = null;
    }
}

// FIXED: Added origin and referrerpolicy to resolve Error 153
function loadVideo(useNoCookie = false) {
    if (!currentMatch || !currentMatch.videos) return;
    const video = currentMatch.videos[currentVideoIndex];
    const videoId = extractYouTubeId(video.key);
    if (!videoId) {
        console.error('No video ID found');
        return;
    }

    console.log('Loading video:', videoId, 'useNoCookie:', useNoCookie);

    document.getElementById('videoError').style.display = 'none';
    const container = document.getElementById('youtubePlayer');
    container.style.display = 'block';
    
    if (ytPlayer) {
        ytPlayer.destroy();
        ytPlayer = null;
    }
    container.innerHTML = '';

    if (useNoCookie) {
        // Fallback iframe embed
        console.log('Using nocookie iframe');
        container.innerHTML = `
            <iframe 
                id="videoIframe"
                width="100%" 
                height="675" 
                src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0" 
                frameborder="0" 
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                allowfullscreen>
            </iframe>
        `;
        
        // Check if iframe loads successfully after a delay
        setTimeout(() => {
            const iframe = document.getElementById('videoIframe');
            if (iframe) {
                console.log('Iframe present, but may have embedding restrictions');
                // If still black after 3 seconds, show error
                setTimeout(() => {
                    console.log('Iframe took too long, showing error message');
                    showVideoError(153, videoId);
                }, 3000);
            }
        }, 1000);
        
        updateVideoControls();
        return;
    }

    // Check if YouTube API is ready
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        console.error('YouTube API not loaded, using iframe fallback');
        loadVideo(true);
        return;
    }

    // Standard API player
    console.log('Creating YT.Player');
    ytPlayer = new YT.Player('youtubePlayer', {
        height: '675',
        width: '100%',
        videoId: videoId,
        playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            mute: 0
        },
        events: {
            'onReady': function(event) {
                console.log('Player ready');
                // Unmute and play for mobile compatibility
                event.target.unMute();
                setTimeout(() => {
                    event.target.playVideo();
                }, 100);
            },
            'onError': (e) => handleVideoError(e.data, videoId),
            'onStateChange': function(event) {
                // Auto-advance to next video when current video ends
                if (event.data === YT.PlayerState.ENDED) {
                    navigateVideo(1);
                }
            }
        }
    });
    updateVideoControls();
}

function handleVideoError(errorCode, videoId) {
    console.log('Video error:', errorCode, 'for video:', videoId);
    
    // For embedding errors, show the YouTube link immediately
    // Don't bother with nocookie fallback as it usually fails too
    if ([101, 150, 153].includes(errorCode)) {
        console.log('Embedding disabled by video owner, showing YouTube link');
        showVideoError(errorCode, videoId);
        return;
    }
    
    console.log('Showing error message for code:', errorCode);
    showVideoError(errorCode, videoId);
}

function showVideoError(errorCode, videoId) {
    document.getElementById('youtubePlayer').style.display = 'none';
    const errorDiv = document.getElementById('videoError');
    document.getElementById('watchOnYouTube').href = `https://www.youtube.com/watch?v=${videoId}`;
    errorDiv.style.display = 'flex';
    const errorMessages = { 2: 'Invalid ID', 100: 'Not found', 101: 'Embed disabled', 150: 'Embed disabled', 153: 'Configuration error (Security)' };
    errorDiv.querySelector('p').textContent = errorMessages[errorCode] || 'Unable to play video';
}

function extractYouTubeId(key) {
    if (key.includes('youtube.com') || key.includes('youtu.be')) {
        const url = new URL(key);
        return url.searchParams.get('v') || url.pathname.split('/').pop();
    }
    return key;
}

function navigateVideo(direction) {
    const newMatchIndex = currentMatchIndex + direction;
    
    // Check bounds
    if (newMatchIndex < 0 || newMatchIndex >= filteredMatches.length) {
        return;
    }
    
    // Find next match with videos
    let nextMatch = filteredMatches[newMatchIndex];
    let searchIndex = newMatchIndex;
    
    // Skip matches without videos
    while ((!nextMatch.videos || nextMatch.videos.length === 0) && 
           searchIndex >= 0 && searchIndex < filteredMatches.length) {
        searchIndex += direction;
        if (searchIndex < 0 || searchIndex >= filteredMatches.length) {
            return; // No more matches with videos
        }
        nextMatch = filteredMatches[searchIndex];
    }
    
    if (nextMatch.videos && nextMatch.videos.length > 0) {
        currentMatchIndex = searchIndex;
        currentMatch = nextMatch;
        currentVideoIndex = 0;
        elements.currentMatchTitle.textContent = getMatchName(currentMatch);
        loadVideo(false);
        displayMatchDetails();
    }
}

function updateVideoControls() {
    const matchNum = currentMatchIndex + 1;
    const totalMatches = filteredMatches.length;
    elements.videoCounter.textContent = `Match ${matchNum} of ${totalMatches}`;
    
    // Check if there are previous/next matches with videos
    let hasPrev = false;
    let hasNext = false;
    
    for (let i = currentMatchIndex - 1; i >= 0; i--) {
        if (filteredMatches[i].videos && filteredMatches[i].videos.length > 0) {
            hasPrev = true;
            break;
        }
    }
    
    for (let i = currentMatchIndex + 1; i < filteredMatches.length; i++) {
        if (filteredMatches[i].videos && filteredMatches[i].videos.length > 0) {
            hasNext = true;
            break;
        }
    }
    
    elements.prevVideo.disabled = !hasPrev;
    elements.nextVideo.disabled = !hasNext;
}

async function displayMatchDetails() {
    // Load Statbotics data
    loadStatboticsData();
}

async function loadStatboticsData() {
    const redStats = document.getElementById('redStats');
    const blueStats = document.getElementById('blueStats');
    const breakdownContainer = document.getElementById('matchBreakdownContainer');
    
    redStats.innerHTML = '<div class="loading-stats">Loading...</div>';
    blueStats.innerHTML = '<div class="loading-stats">Loading...</div>';
    
    try {
        const matchKey = currentMatch.key;
        console.log('Fetching Statbotics data for:', matchKey);
        
        // Fetch match data from Statbotics
        const matchResponse = await fetch(`${STATBOTICS_API_BASE}/match/${matchKey}`);
        console.log('Statbotics response status:', matchResponse.status);
        
        if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            console.log('Statbotics match data:', matchData);
            
            displayStatboticsBreakdown(matchData);
            displayMatchBreakdownTable(matchData);
            breakdownContainer.style.display = 'block';
            
            // Load team stats
            loadTeamStats(matchData);
        } else {
            console.warn('Statbotics API returned non-OK status:', matchResponse.status);
            redStats.innerHTML = '<div class="loading-stats">Match statistics not available</div>';
            blueStats.innerHTML = '<div class="loading-stats">Match statistics not available</div>';
            breakdownContainer.style.display = 'none';
            document.getElementById('teamStatsContainer').style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading Statbotics data:', error);
        redStats.innerHTML = '<div class="loading-stats">Statistics unavailable</div>';
        blueStats.innerHTML = '<div class="loading-stats">Statistics unavailable</div>';
        breakdownContainer.style.display = 'none';
        document.getElementById('teamStatsContainer').style.display = 'none';
    }
}

function displayStatboticsBreakdown(matchData) {
    const redStats = document.getElementById('redStats');
    const blueStats = document.getElementById('blueStats');
    
    if (!matchData) {
        redStats.innerHTML = '<div class="loading-stats">Match data not available</div>';
        blueStats.innerHTML = '';
        return;
    }
    
    const redTeams = matchData.alliances.red.team_keys.join(', ');
    const blueTeams = matchData.alliances.blue.team_keys.join(', ');
    
    // Get predictions from Statbotics
    const pred = matchData.pred || {};
    const redPred = Math.round(pred.red_score || 0);
    const bluePred = Math.round(pred.blue_score || 0);
    const redWinProb = ((pred.red_win_prob || 0) * 100).toFixed(0);
    const blueWinProb = pred.blue_win_prob ? ((pred.blue_win_prob) * 100).toFixed(0) : (100 - parseFloat(redWinProb)).toFixed(0);
    
    // Get actual results from Statbotics
    const result = matchData.result || {};
    const redScore = result.red_score || null;
    const blueScore = result.blue_score || null;
    const redAuto = result.red_auto_points || 0;
    const blueAuto = result.blue_auto_points || 0;
    const redTeleop = result.red_teleop_points || 0;
    const blueTeleop = result.blue_teleop_points || 0;
    const redEndgame = result.red_endgame_points || 0;
    const blueEndgame = result.blue_endgame_points || 0;
    
    const hasResults = redScore !== null;
    
    const redHtml = `
        <div class="alliance-column">
            <div class="alliance-header">Red Alliance</div>
            <div class="team-numbers">${redTeams}</div>
            
            <div class="stat-row">
                <span class="stat-label">Win Prob</span>
                <span class="stat-value">${redWinProb}%</span>
            </div>
            
            <div class="score-box">
                <div class="score-type">Predicted</div>
                <div class="score-number">${redPred}</div>
            </div>
            
            ${hasResults ? `
            <div class="score-box actual">
                <div class="score-type">Actual</div>
                <div class="score-number">${redScore}</div>
            </div>
            
            <div class="breakdown">
                <div class="breakdown-item">
                    <span class="breakdown-label">Auto</span>
                    <span class="breakdown-value">${redAuto}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Teleop</span>
                    <span class="breakdown-value">${redTeleop}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Endgame</span>
                    <span class="breakdown-value">${redEndgame}</span>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    const blueHtml = `
        <div class="alliance-column">
            <div class="alliance-header">Blue Alliance</div>
            <div class="team-numbers">${blueTeams}</div>
            
            <div class="stat-row">
                <span class="stat-label">Win Prob</span>
                <span class="stat-value">${blueWinProb}%</span>
            </div>
            
            <div class="score-box">
                <div class="score-type">Predicted</div>
                <div class="score-number">${bluePred}</div>
            </div>
            
            ${hasResults ? `
            <div class="score-box actual">
                <div class="score-type">Actual</div>
                <div class="score-number">${blueScore}</div>
            </div>
            
            <div class="breakdown">
                <div class="breakdown-item">
                    <span class="breakdown-label">Auto</span>
                    <span class="breakdown-value">${blueAuto}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Teleop</span>
                    <span class="breakdown-value">${blueTeleop}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Endgame</span>
                    <span class="breakdown-value">${blueEndgame}</span>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    redStats.innerHTML = redHtml;
    blueStats.innerHTML = blueHtml;
}

function displayMatchBreakdownTable(matchData) {
    const breakdownTable = document.getElementById('matchBreakdownTable');
    
    if (!matchData || !matchData.result) {
        breakdownTable.innerHTML = '<p style="text-align: center; color: var(--text-light);">Breakdown not available for upcoming matches</p>';
        return;
    }
    
    const redTeams = matchData.alliances.red.team_keys;
    const blueTeams = matchData.alliances.blue.team_keys;
    const pred = matchData.pred || {};
    const result = matchData.result || {};
    
    // Get predicted values
    const redPredTotal = Math.round(pred.red_score || 0);
    const bluePredTotal = Math.round(pred.blue_score || 0);
    const redRP1Pred = pred.red_rp_1 || 0;
    const redRP2Pred = pred.red_rp_2 || 0;
    const redRP3Pred = pred.red_rp_3 || 0;
    const blueRP1Pred = pred.blue_rp_1 || 0;
    const blueRP2Pred = pred.blue_rp_2 || 0;
    const blueRP3Pred = pred.blue_rp_3 || 0;
    
    // Get actual values
    const redAuto = result.red_auto_points || 0;
    const blueAuto = result.blue_auto_points || 0;
    const redTeleop = result.red_teleop_points || 0;
    const blueTeleop = result.blue_teleop_points || 0;
    const redEndgame = result.red_endgame_points || 0;
    const blueEndgame = result.blue_endgame_points || 0;
    const redFouls = result.blue_no_foul ? (result.red_score - result.blue_no_foul) : 0;
    const blueFouls = result.red_no_foul ? (result.blue_score - result.red_no_foul) : 0;
    const redRP1 = result.red_rp_1 ? 1 : 0;
    const redRP2 = result.red_rp_2 ? 1 : 0;
    const redRP3 = result.red_rp_3 ? 1 : 0;
    const blueRP1 = result.blue_rp_1 ? 1 : 0;
    const blueRP2 = result.blue_rp_2 ? 1 : 0;
    const blueRP3 = result.blue_rp_3 ? 1 : 0;
    const redTotal = result.red_score || 0;
    const blueTotal = result.blue_score || 0;
    
    // Estimate predicted breakdowns
    const redAutoPred = Math.round(redPredTotal * 0.30);
    const redTeleopPred = Math.round(redPredTotal * 0.50);
    const redEndgamePred = Math.round(redPredTotal * 0.20);
    const blueAutoPred = Math.round(bluePredTotal * 0.30);
    const blueTeleopPred = Math.round(bluePredTotal * 0.50);
    const blueEndgamePred = Math.round(bluePredTotal * 0.20);
    
    const html = `
        <table class="breakdown-table-full">
            <thead>
                <tr>
                    <th class="team-header red-bg">${redTeams[0]}</th>
                    <th class="team-header red-bg">${redTeams[1]}</th>
                    <th class="team-header red-bg">${redTeams[2]}</th>
                    <th class="pred-header">Predicted</th>
                    <th class="actual-header">Actual</th>
                    <th class="category-header"></th>
                    <th class="actual-header">Actual</th>
                    <th class="pred-header">Predicted</th>
                    <th class="team-header blue-bg">${blueTeams[0]}</th>
                    <th class="team-header blue-bg">${blueTeams[1]}</th>
                    <th class="team-header blue-bg">${blueTeams[2]}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>-</td><td>-</td><td>-</td>
                    <td class="pred-cell">${redAutoPred}</td>
                    <td class="actual-cell">${redAuto}</td>
                    <td class="category-cell">Auto</td>
                    <td class="actual-cell">${blueAuto}</td>
                    <td class="pred-cell">${blueAutoPred}</td>
                    <td>-</td><td>-</td><td>-</td>
                </tr>
                <tr>
                    <td>-</td><td>-</td><td>-</td>
                    <td class="pred-cell">${redTeleopPred}</td>
                    <td class="actual-cell">${redTeleop}</td>
                    <td class="category-cell">Teleop</td>
                    <td class="actual-cell">${blueTeleop}</td>
                    <td class="pred-cell">${blueTeleopPred}</td>
                    <td>-</td><td>-</td><td>-</td>
                </tr>
                <tr>
                    <td>-</td><td>-</td><td>-</td>
                    <td class="pred-cell">${redEndgamePred}</td>
                    <td class="actual-cell">${redEndgame}</td>
                    <td class="category-cell">Endgame</td>
                    <td class="actual-cell">${blueEndgame}</td>
                    <td class="pred-cell">${blueEndgamePred}</td>
                    <td>-</td><td>-</td><td>-</td>
                </tr>
                <tr>
                    <td>-</td><td>-</td><td>-</td>
                    <td class="pred-cell">-</td>
                    <td class="actual-cell">${redFouls}</td>
                    <td class="category-cell">Fouls</td>
                    <td class="actual-cell">${blueFouls}</td>
                    <td class="pred-cell">-</td>
                    <td>-</td><td>-</td><td>-</td>
                </tr>
                <tr>
                    <td>-</td><td>-</td><td>-</td>
                    <td class="pred-cell">${redRP1Pred.toFixed(2)}</td>
                    <td class="actual-cell">${redRP1}</td>
                    <td class="category-cell">RP1</td>
                    <td class="actual-cell">${blueRP1}</td>
                    <td class="pred-cell">${blueRP1Pred.toFixed(2)}</td>
                    <td>-</td><td>-</td><td>-</td>
                </tr>
                <tr>
                    <td>-</td><td>-</td><td>-</td>
                    <td class="pred-cell">${redRP2Pred.toFixed(2)}</td>
                    <td class="actual-cell">${redRP2}</td>
                    <td class="category-cell">RP2</td>
                    <td class="actual-cell">${blueRP2}</td>
                    <td class="pred-cell">${blueRP2Pred.toFixed(2)}</td>
                    <td>-</td><td>-</td><td>-</td>
                </tr>
                <tr>
                    <td>-</td><td>-</td><td>-</td>
                    <td class="pred-cell">${redRP3Pred.toFixed(2)}</td>
                    <td class="actual-cell">${redRP3}</td>
                    <td class="category-cell">RP3</td>
                    <td class="actual-cell">${blueRP3}</td>
                    <td class="pred-cell">${blueRP3Pred.toFixed(2)}</td>
                    <td>-</td><td>-</td><td>-</td>
                </tr>
                <tr class="total-row">
                    <td><strong>-</strong></td>
                    <td><strong>-</strong></td>
                    <td><strong>-</strong></td>
                    <td class="pred-cell"><strong>${redPredTotal}</strong></td>
                    <td class="actual-cell"><strong>${redTotal}</strong></td>
                    <td class="category-cell"><strong>Total</strong></td>
                    <td class="actual-cell"><strong>${blueTotal}</strong></td>
                    <td class="pred-cell"><strong>${bluePredTotal}</strong></td>
                    <td><strong>-</strong></td>
                    <td><strong>-</strong></td>
                    <td><strong>-</strong></td>
                </tr>
            </tbody>
        </table>
        <p class="breakdown-note">Individual team contributions not available from API</p>
    `;
    
    breakdownTable.innerHTML = html;
}

async function loadTeamStats(matchData) {
    const teamStatsContainer = document.getElementById('teamStatsContainer');
    const teamStatsContent = document.getElementById('teamStatsContent');
    
    teamStatsContent.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Loading team stats...</div>';
    teamStatsContainer.style.display = 'block';
    
    try {
        const year = currentMatch.key.substring(0, 4);
        const redTeams = matchData.alliances.red.team_keys;
        const blueTeams = matchData.alliances.blue.team_keys;
        
        console.log('Loading team stats for year:', year);
        console.log('Red teams:', redTeams);
        console.log('Blue teams:', blueTeams);
        
        // Fetch stats for all teams
        const teamPromises = [...redTeams, ...blueTeams].map(teamKey => {
            const teamNum = teamKey.replace('frc', '');
            const url = `${STATBOTICS_API_BASE}/team_year/${teamNum}/${year}`;
            console.log('Fetching:', url);
            return fetch(url)
                .then(res => {
                    console.log(`Team ${teamNum} response status:`, res.status);
                    return res.ok ? res.json() : null;
                })
                .catch(err => {
                    console.error(`Error fetching team ${teamNum}:`, err);
                    return null;
                });
        });
        
        const teamStats = await Promise.all(teamPromises);
        console.log('Team stats received:', teamStats);
        
        // Display stats
        let html = '';
        
        // Red alliance teams
        redTeams.forEach((teamKey, index) => {
            const stats = teamStats[index];
            html += formatTeamStatBox(teamKey, stats, 'red-team');
        });
        
        // Blue alliance teams
        blueTeams.forEach((teamKey, index) => {
            const stats = teamStats[redTeams.length + index];
            html += formatTeamStatBox(teamKey, stats, 'blue-team');
        });
        
        teamStatsContent.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading team stats:', error);
        teamStatsContent.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Team stats unavailable</div>';
    }
}

function formatTeamStatBox(teamKey, stats, allianceClass) {
    const teamNum = teamKey.replace('frc', '');
    
    if (!stats) {
        return `
            <div class="team-stat-box ${allianceClass}">
                <h4>Team ${teamNum}</h4>
                <div style="color: var(--text-muted); text-align: center; padding: 10px 0;">Stats not available</div>
            </div>
        `;
    }
    
    const epa = stats.epa?.breakdown?.total_points?.mean || 0;
    const record = `${stats.record?.season?.wins || 0}-${stats.record?.season?.losses || 0}-${stats.record?.season?.ties || 0}`;
    const rank = stats.epa?.ranks?.total_points?.rank || 'N/A';
    const totalTeams = stats.epa?.ranks?.total_points?.team_count || 'N/A';
    
    return `
        <div class="team-stat-box ${allianceClass}">
            <h4>Team ${teamNum}</h4>
            <div class="team-stat-item">
                <span class="label">EPA</span>
                <span class="value">${epa.toFixed(1)}</span>
            </div>
            <div class="team-stat-item">
                <span class="label">Record</span>
                <span class="value">${record}</span>
            </div>
            <div class="team-stat-item">
                <span class="label">Rank</span>
                <span class="value">${rank} / ${totalTeams}</span>
            </div>
        </div>
    `;
}

function displayPrediction(prediction) {
    const statsPrediction = document.getElementById('statsPrediction');
    
    // Check if prediction data is valid
    if (!prediction || (!prediction.red_win_prob && prediction.red_win_prob !== 0)) {
        statsPrediction.innerHTML = '<div class="loading-stats">Match prediction not available</div>';
        return;
    }
    
    const redWinProb = ((prediction.red_win_prob || 0) * 100).toFixed(1);
    const blueWinProb = prediction.blue_win_prob ? ((prediction.blue_win_prob) * 100).toFixed(1) : (100 - parseFloat(redWinProb)).toFixed(1);
    const redScore = (prediction.red_score || prediction.red_score === 0) ? prediction.red_score.toFixed(0) : '?';
    const blueScore = (prediction.blue_score || prediction.blue_score === 0) ? prediction.blue_score.toFixed(0) : '?';
    
    statsPrediction.innerHTML = `
        <div class="stats-prediction">
            <div class="prediction-side red">
                <h4>Red Alliance</h4>
                <div class="win-prob">${redWinProb}%</div>
                <div class="predicted-score">Predicted: ${redScore} pts</div>
            </div>
            <div style="display: flex; align-items: center; padding: 0 30px;">
                <span style="font-size: 2.5em; color: var(--text-light); font-weight: bold;">VS</span>
            </div>
            <div class="prediction-side blue">
                <h4>Blue Alliance</h4>
                <div class="win-prob">${blueWinProb}%</div>
                <div class="predicted-score">Predicted: ${blueScore} pts</div>
            </div>
        </div>
    `;
}

function displayTeamStats(teamStats, redTeams, blueTeams) {
    const statsTeams = document.getElementById('statsTeams');
    
    const validStats = teamStats.filter(stat => stat !== null);
    if (validStats.length === 0) {
        statsTeams.innerHTML = '<div class="loading-stats">Team statistics not available</div>';
        return;
    }
    
    let html = '<h4 style="margin-bottom: 15px; color: var(--text);">Team Statistics</h4>';
    html += '<div class="team-stats-grid">';
    
    teamStats.forEach((stat, index) => {
        if (!stat) return;
        
        const teamNum = index < redTeams.length ? redTeams[index] : blueTeams[index - redTeams.length];
        const alliance = index < redTeams.length ? 'red' : 'blue';
        
        html += `
            <div class="team-stat-card ${alliance}">
                <h5>Team ${teamNum}</h5>
                <div class="stat-row">
                    <span class="stat-label">EPA Rating</span>
                    <span class="stat-value">${stat.epa?.total_points?.mean?.toFixed(1) || 'N/A'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Auto EPA</span>
                    <span class="stat-value">${stat.epa?.auto_points?.mean?.toFixed(1) || 'N/A'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Record</span>
                    <span class="stat-value">${stat.record?.season?.wins || 0}-${stat.record?.season?.losses || 0}-${stat.record?.season?.ties || 0}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Rank</span>
                    <span class="stat-value">${stat.record?.season?.rank || 'N/A'} / ${stat.record?.season?.count || 'N/A'}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    statsTeams.innerHTML = html;
}

function filterMatches() { displayMatches(); }

function updateStats() {
    const totalMatches = allMatches.length;
    const matchesWithVideos = allMatches.filter(m => m.videos?.length > 0).length;
    elements.matchCount.textContent = `${totalMatches} Matches`;
    elements.videoCount.textContent = `${allMatches.reduce((sum, m) => sum + (m.videos?.length || 0), 0)} Videos`;
}

function getMatchName(match) {
    return match.comp_level === 'qm' ? `Qualification ${match.match_number}` : `${getMatchTypeName(match.comp_level)} ${match.set_number}-${match.match_number}`;
}

function getMatchTypeName(compLevel) {
    const types = { 'qm': 'Qualification', 'ef': 'Eighth Finals', 'qf': 'Quarter Finals', 'sf': 'Semi Finals', 'f': 'Finals' };
    return types[compLevel] || compLevel.toUpperCase();
}

function formatTeamNumber(teamKey) { return teamKey.replace('frc', 'Team '); }
function showLoading(show) { elements.loading.style.display = show ? 'block' : 'none'; }
function showError(message) { elements.error.textContent = message; elements.error.style.display = 'block'; }
function hideError() { elements.error.style.display = 'none'; }

// Screen orientation lock functions for mobile
function lockOrientation() {
    try {
        // Try the Screen Orientation API (supported on most modern mobile browsers)
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
                console.log('Orientation lock not supported or failed:', err);
            });
        }
    } catch (err) {
        console.log('Screen orientation API not available:', err);
    }
}

function unlockOrientation() {
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } catch (err) {
        console.log('Screen orientation unlock failed:', err);
    }
}

// Fullscreen helpers for mobile devices
function requestFullscreen() {
    const videoPlayer = elements.videoPlayer;
    
    // Only auto-fullscreen on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    if (!isMobile) return;
    
    try {
        if (videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (videoPlayer.webkitRequestFullscreen) {
            videoPlayer.webkitRequestFullscreen();
        } else if (videoPlayer.mozRequestFullScreen) {
            videoPlayer.mozRequestFullScreen();
        } else if (videoPlayer.msRequestFullscreen) {
            videoPlayer.msRequestFullscreen();
        }
    } catch (err) {
        console.log('Fullscreen not supported:', err);
    }
}

function exitFullscreen() {
    try {
        if (document.fullscreenElement || document.webkitFullscreenElement || 
            document.mozFullScreenElement || document.msFullscreenElement) {
            
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    } catch (err) {
        console.log('Exit fullscreen failed:', err);
    }
}

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
