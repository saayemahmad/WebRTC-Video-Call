// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, remove, onDisconnect, get } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB3xmstmk0uSPw-hJkCoP9jS9r9MA2Yuo4",
    authDomain: "dbase-6d041.firebaseapp.com",
    databaseURL: "https://dbase-6d041-default-rtdb.firebaseio.com",
    projectId: "dbase-6d041",
    storageBucket: "dbase-6d041.firebasestorage.app",
    messagingSenderId: "822213668463",
    appId: "1:822213668463:web:cf4f2bd08e769467eae79a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// WebRTC configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};

// Global variables
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let roomId = null;
let isCreator = false;
let pendingCandidates = [];
let currentUser = null;
let partnerUser = null;
let statusCheckInterval = null;
let pendingIncomingCall = null;
let callStartTime = null;
let callHistoryListener = null;
let durationInterval = null;

// Get DOM elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// User data
const users = {
    'Sayem': {
        name: 'Sayem',
        avatar: 'S',
        photo: 'https://i.pravatar.cc/150?img=12',
        color: '#3B82F6',
        partner: 'Shajeda'
    },
    'Shajeda': {
        name: 'Shajeda',
        avatar: 'S',
        photo: 'https://i.pravatar.cc/150?img=47',
        color: '#EC4899',
        partner: 'Sayem'
    }
};

// Debug logging
function debugLog(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Select user and login
window.selectUser = async function(username) {
    currentUser = users[username];
    partnerUser = users[currentUser.partner];
    
    debugLog(`User selected: ${username}`, 'info');
    debugLog(`Partner: ${partnerUser.name}`, 'info');
    
    // Show dashboard immediately
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.add('active');
    
    // Update UI
    document.getElementById('headerAvatar').style.backgroundImage = `url(${currentUser.photo})`;
    document.getElementById('headerAvatar').style.backgroundSize = 'cover';
    document.getElementById('headerAvatar').style.backgroundPosition = 'center';
    document.getElementById('headerAvatar').textContent = '';
    document.getElementById('headerUsername').textContent = currentUser.name;
    document.getElementById('userInfo').classList.add('visible');
    document.getElementById('userInfo').style.display = 'flex';
    
    document.getElementById('welcomeAvatar').style.backgroundImage = `url(${currentUser.photo})`;
    document.getElementById('welcomeAvatar').style.backgroundSize = 'cover';
    document.getElementById('welcomeAvatar').style.backgroundPosition = 'center';
    document.getElementById('welcomeAvatar').textContent = '';
    document.getElementById('welcomeName').textContent = currentUser.name;
    
    document.getElementById('partnerAvatar').style.backgroundImage = `url(${partnerUser.photo})`;
    document.getElementById('partnerAvatar').style.backgroundSize = 'cover';
    document.getElementById('partnerAvatar').style.backgroundPosition = 'center';
    document.getElementById('partnerAvatar').textContent = '';
    document.getElementById('partnerName').textContent = partnerUser.name;
    
    // Re-create the partner status indicator (it was removed by textContent)
    const partnerAvatar = document.getElementById('partnerAvatar');
    let statusIndicator = document.getElementById('partnerStatus');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.className = 'partner-badge offline';
        statusIndicator.id = 'partnerStatus';
        partnerAvatar.appendChild(statusIndicator);
    } else {
        // Reset status to offline initially
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
    }
    
    // Reset call button to offline state initially
    const callBtn = document.getElementById('callPartnerBtn');
    const statusOrb = document.getElementById('statusOrb');
    const statusText = document.getElementById('partnerStatusText');
    const callHint = document.getElementById('callHint');
    
    if (callBtn) {
        callBtn.classList.remove('online');
        callBtn.classList.add('offline');
        callBtn.disabled = true;
    }
    if (statusOrb) {
        statusOrb.classList.remove('online');
    }
    if (statusText) {
        statusText.textContent = 'Checking status…';
    }
    if (callHint) {
        callHint.textContent = 'Checking partner status…';
    }
    
    try {
        // Set user online status in Firebase
        debugLog('Setting user status to online...', 'info');
        const userStatusRef = ref(database, `users/${currentUser.name}/status`);
        await set(userStatusRef, {
            online: true,
            lastSeen: Date.now()
        });
        debugLog('✓ User status set to online', 'success');
        
        // Set offline on disconnect (browser close, refresh, network loss)
        const disconnectRef = onDisconnect(userStatusRef);
        await disconnectRef.set({
            online: false,
            lastSeen: Date.now()
        });
        debugLog('✓ Disconnect handler set', 'success');
        
        // Also end any active call on disconnect
        if (roomId) {
            const callRef = ref(database, `calls/${roomId}`);
            const callDisconnectRef = onDisconnect(callRef);
            await callDisconnectRef.update({ status: 'ended' });
            debugLog('✓ Call disconnect handler set', 'success');
        }
    } catch (error) {
        debugLog(`✗ Firebase error: ${error.message}`, 'error');
        window.showModal('Connection Error', 'Firebase connection error. Please check your internet connection.', 'fa-wifi');
        return;
    }
    
    // Start checking partner status
    debugLog('Starting partner status check...', 'info');
    
    // Force immediate status check with get() first, then set up listener
    const partnerStatusRef = ref(database, `users/${partnerUser.name}/status`);
    get(partnerStatusRef).then((snapshot) => {
        const status = snapshot.val();
        debugLog(`Initial partner status: ${JSON.stringify(status)}`, 'info');
        
        const isOnline = status && status.online === true;
        const statusElement = document.getElementById('partnerStatus');
        const statusOrb = document.getElementById('statusOrb');
        const statusText = document.getElementById('partnerStatusText');
        const callBtn = document.getElementById('callPartnerBtn');
        const callHint = document.getElementById('callHint');
        
        if (statusElement && statusText && callBtn) {
            if (isOnline) {
                statusElement.classList.remove('offline');
                statusElement.classList.add('online');
                if (statusOrb) statusOrb.classList.add('online');
                statusText.textContent = 'Online';
                callBtn.classList.remove('offline');
                callBtn.classList.add('online');
                callBtn.disabled = false;
                if (callHint) callHint.textContent = 'Ready to connect';
                debugLog(`✓ Initial: ${partnerUser.name} is online`, 'success');
            } else {
                statusElement.classList.remove('online');
                statusElement.classList.add('offline');
                if (statusOrb) statusOrb.classList.remove('online');
                statusText.textContent = 'Offline';
                callBtn.classList.remove('online');
                callBtn.classList.add('offline');
                callBtn.disabled = true;
                if (callHint) callHint.textContent = 'Waiting for partner to come online…';
                debugLog(`Initial: ${partnerUser.name} is offline`, 'warning');
            }
        }
        
        // Now set up the real-time listener
        checkPartnerStatus();
        startStatusCheck();
    }).catch((error) => {
        debugLog(`Error getting initial status: ${error.message}`, 'error');
        // Still set up listener even if initial fetch fails
        checkPartnerStatus();
        startStatusCheck();
    });
    
    // Start listening for incoming calls
    debugLog('Starting incoming call listener...', 'info');
    listenForIncomingCalls();
    
    // Load call history
    loadCallHistory();
};

// Check partner online status
let partnerStatusListener = null;

function checkPartnerStatus() {
    if (!partnerUser) {
        debugLog('No partner user set yet', 'info');
        return;
    }
    
    debugLog(`Checking status for ${partnerUser.name}...`, 'info');
    
    // Remove previous listener if exists
    if (partnerStatusListener) {
        debugLog('Removing previous partner status listener', 'info');
        partnerStatusListener();
        partnerStatusListener = null;
    }
    
    const partnerStatusRef = ref(database, `users/${partnerUser.name}/status`);
    partnerStatusListener = onValue(partnerStatusRef, (snapshot) => {
        debugLog(`Partner status snapshot received for ${partnerUser.name}`, 'info');
        
        const status = snapshot.val();
        debugLog(`Partner status data: ${JSON.stringify(status)}`, 'info');
        
        const isOnline = status && status.online === true;
        
        // Update UI immediately
        const statusElement = document.getElementById('partnerStatus');
        const statusOrb = document.getElementById('statusOrb');
        const statusText = document.getElementById('partnerStatusText');
        const callBtn = document.getElementById('callPartnerBtn');
        const callHint = document.getElementById('callHint');
        
        // Check if we're on the dashboard screen
        const dashboardScreen = document.getElementById('dashboardScreen');
        if (!dashboardScreen || !dashboardScreen.classList.contains('active')) {
            debugLog('Dashboard not active, skipping UI update', 'info');
            return;
        }
        
        if (statusElement && statusText && callBtn) {
            if (isOnline) {
                statusElement.classList.remove('offline');
                statusElement.classList.add('online');
                if (statusOrb) {
                    statusOrb.classList.add('online');
                }
                statusText.textContent = 'Online';
                callBtn.classList.remove('offline');
                callBtn.classList.add('online');
                callBtn.disabled = false;
                if (callHint) {
                    callHint.textContent = 'Ready to connect';
                }
                debugLog(`✓ ${partnerUser.name} is online`, 'success');
            } else {
                statusElement.classList.remove('online');
                statusElement.classList.add('offline');
                if (statusOrb) {
                    statusOrb.classList.remove('online');
                }
                statusText.textContent = 'Offline';
                callBtn.classList.remove('online');
                callBtn.classList.add('offline');
                callBtn.disabled = true;
                if (callHint) {
                    callHint.textContent = 'Waiting for partner to come online…';
                }
                debugLog(`${partnerUser.name} is offline`, 'warning');
            }
        } else {
            debugLog('Status UI elements not found', 'warning');
        }
    }, (error) => {
        debugLog(`✗ Error checking partner status: ${error.message}`, 'error');
    });
}

// Start periodic status check
function startStatusCheck() {
    statusCheckInterval = setInterval(() => {
        const userStatusRef = ref(database, `users/${currentUser.name}/status`);
        update(userStatusRef, { lastSeen: Date.now() });
    }, 30000); // Update every 30 seconds
}

// Stop status check
function stopStatusCheck() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
}

// Call partner
window.callPartner = async function() {
    debugLog(`Calling ${partnerUser.name}...`, 'info');
    
    // Check if partner is still online
    const partnerStatusRef = ref(database, `users/${partnerUser.name}/status`);
    const snapshot = await get(partnerStatusRef);
    const status = snapshot.val();
    
    if (!status || !status.online) {
        window.showModal('Partner Offline', `${partnerUser.name} is offline. Cannot make call.`, 'fa-user-slash');
        debugLog('Partner is offline, call aborted', 'error');
        return;
    }
    
    // Generate room ID
    roomId = `${currentUser.name}_${partnerUser.name}_${Date.now()}`;
    isCreator = true;
    
    // Show calling screen
    const callingAvatar = document.getElementById('callingAvatar');
    callingAvatar.style.backgroundImage = `url(${partnerUser.photo})`;
    callingAvatar.style.backgroundSize = 'cover';
    callingAvatar.style.backgroundPosition = 'center';
    callingAvatar.textContent = '';
    document.getElementById('callingStatus').innerHTML = `Calling ${partnerUser.name}<span class="loading-dots"></span>`;
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('callingScreen').classList.add('active');
    
    // Initialize call
    await initCall();
};

// Initialize call
async function initCall() {
    if (!await initLocalStream()) return;
    
    createPeerConnection();
    
    debugLog('Creating offer...', 'info');
    const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
    });
    await peerConnection.setLocalDescription(offer);
    debugLog('✓ Offer created', 'success');
    
    // Save call data to Firebase
    const callRef = ref(database, `calls/${roomId}`);
    await set(callRef, {
        caller: currentUser.name,
        callee: partnerUser.name,
        offer: {
            type: offer.type,
            sdp: offer.sdp
        },
        status: 'calling',
        createdAt: Date.now()
    });
    
    // Set up disconnect handlers for call
    const callDisconnectRef = onDisconnect(callRef);
    await callDisconnectRef.update({ status: 'ended' });
    debugLog('✓ Call disconnect handler set', 'success');
    
    debugLog('✓ Call initiated', 'success');
    
    // Listen for answer
    const answerRef = ref(database, `calls/${roomId}/answer`);
    onValue(answerRef, async (snapshot) => {
        const answer = snapshot.val();
        if (answer && !peerConnection.currentRemoteDescription) {
            debugLog('✓ Received answer', 'success');
            const answerDescription = new RTCSessionDescription(answer);
            await peerConnection.setRemoteDescription(answerDescription);
            
            // Process pending candidates
            if (pendingCandidates.length > 0) {
                debugLog(`Adding ${pendingCandidates.length} pending candidates`, 'info');
                for (const candidate of pendingCandidates) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        debugLog(`Error adding candidate: ${e.message}`, 'error');
                    }
                }
                pendingCandidates = [];
            }
        }
    });
    
    // Listen for call status changes (rejection)
    const statusRef = ref(database, `calls/${roomId}/status`);
    onValue(statusRef, (snapshot) => {
        const status = snapshot.val();
        if (status === 'rejected') {
            debugLog('Call was rejected by callee', 'warning');
            window.showModal('Call Declined', `${partnerUser.name} declined the call.`, 'fa-phone-slash');
            hangup();
        }
    });
    
    // Listen for callee ICE candidates
    const calleeRef = ref(database, `calls/${roomId}/candidates/callee`);
    onValue(calleeRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const candidate = childSnapshot.val();
            if (candidate && peerConnection) {
                if (peerConnection.remoteDescription) {
                    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(e => debugLog(`Error adding candidate: ${e.message}`, 'error'));
                } else {
                    pendingCandidates.push(candidate);
                }
            }
        });
    });
}

// Listen for incoming calls
function listenForIncomingCalls() {
    if (!currentUser) {
        debugLog('No current user, skipping incoming call listener', 'info');
        return;
    }
    
    const callsRef = ref(database, 'calls');
    onValue(callsRef, async (snapshot) => {
        if (!currentUser) return; // Double check
        
        const calls = snapshot.val();
        if (!calls) {
            // No calls exist - if we're in a call, it was ended
            if (roomId) {
                debugLog('Call was ended by other user', 'warning');
                window.showModal('Call Ended', `${partnerUser.name} ended the call.`, 'fa-phone-slash');
                hangup();
            }
            return;
        }
        
        // Check if our current call still exists
        if (roomId && calls[roomId]) {
            const callData = calls[roomId];
            if (callData.status === 'ended') {
                debugLog('Call ended by other user', 'warning');
                window.showModal('Call Ended', `${partnerUser.name} ended the call.`, 'fa-phone-slash');
                hangup();
                return;
            }
        } else if (roomId) {
            // Our call was removed
            debugLog('Call was removed, ending...', 'warning');
            window.showModal('Call Ended', 'The call has been disconnected.', 'fa-phone-slash');
            hangup();
            return;
        }
        
        // Look for new incoming calls
        for (const [callId, callData] of Object.entries(calls)) {
            if (callData.callee === currentUser.name && 
                callData.status === 'calling' && 
                !roomId) {
                debugLog(`Incoming call from ${callData.caller}`, 'info');
                
                // Store pending call data
                pendingIncomingCall = { callId, callData };
                
                // Show incoming call screen
                const caller = users[callData.caller];
                const callingAvatar = document.getElementById('callingAvatar');
                callingAvatar.style.backgroundImage = `url(${caller.photo})`;
                callingAvatar.style.backgroundSize = 'cover';
                callingAvatar.style.backgroundPosition = 'center';
                callingAvatar.textContent = '';
                document.getElementById('callingStatus').textContent = `Incoming call from ${caller.name}`;
                document.getElementById('callingSubtitle').innerHTML = '<span class="status-orb online"></span> Wants to connect';
                document.getElementById('incomingCallActions').classList.add('visible');
                document.getElementById('dashboardScreen').classList.remove('active');
                document.getElementById('callingScreen').classList.add('active');
                
                break;
            }
        }
    });
}

// Accept incoming call
window.acceptIncomingCall = async function() {
    if (!pendingIncomingCall) return;
    
    debugLog('Accepting incoming call...', 'info');
    
    const { callId, callData } = pendingIncomingCall;
    roomId = callId;
    isCreator = false;
    
    // Hide accept/reject buttons and update text
    document.getElementById('incomingCallActions').classList.remove('visible');
    document.getElementById('callingStatus').innerHTML = 'Connecting<span class="loading-ellipsis"></span>';
    document.getElementById('callingSubtitle').innerHTML = '<span class="status-orb online"></span> Establishing connection';
    
    // Answer the call
    await answerCall(callData);
    pendingIncomingCall = null;
};

// Reject incoming call
window.rejectIncomingCall = async function() {
    if (!pendingIncomingCall) return;
    
    debugLog('Rejecting incoming call...', 'info');
    
    const { callId } = pendingIncomingCall;
    const callerName = pendingIncomingCall.callData.caller;
    
    // Save missed call to history
    if (currentUser && partnerUser) {
        await saveCallHistory({
            partner: callerName,
            type: 'missed',
            duration: 0,
            timestamp: Date.now(),
            status: 'missed'
        });
    }
    
    // Update call status to rejected
    try {
        const callRef = ref(database, `calls/${callId}`);
        await update(callRef, { status: 'rejected' });
        debugLog('✓ Call rejected', 'success');
    } catch (error) {
        debugLog(`Error rejecting call: ${error.message}`, 'error');
    }
    
    // Hide incoming call screen
    document.getElementById('incomingCallActions').classList.remove('visible');
    document.getElementById('callingScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    
    // Show declined modal
    window.showModal('Call Declined', `You declined the call from ${callerName}.`, 'fa-phone-slash');
    
    pendingIncomingCall = null;
};

// Answer incoming call
async function answerCall(callData) {
    if (!await initLocalStream()) return;
    
    createPeerConnection();
    
    debugLog('Processing offer...', 'info');
    const offerDescription = new RTCSessionDescription(callData.offer);
    await peerConnection.setRemoteDescription(offerDescription);
    
    // Process pending candidates
    if (pendingCandidates.length > 0) {
        for (const candidate of pendingCandidates) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                debugLog(`Error adding candidate: ${e.message}`, 'error');
            }
        }
        pendingCandidates = [];
    }
    
    debugLog('Creating answer...', 'info');
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Save answer
    const answerRef = ref(database, `calls/${roomId}/answer`);
    await set(answerRef, {
        type: answer.type,
        sdp: answer.sdp
    });
    
    // Update call status
    const callRef = ref(database, `calls/${roomId}/status`);
    await set(callRef, 'connected');
    
    debugLog('✓ Answer sent', 'success');
    
    // Listen for caller ICE candidates
    const callerRef = ref(database, `calls/${roomId}/candidates/caller`);
    onValue(callerRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const candidate = childSnapshot.val();
            if (candidate && peerConnection) {
                if (peerConnection.remoteDescription) {
                    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(e => debugLog(`Error adding candidate: ${e.message}`, 'error'));
                } else {
                    pendingCandidates.push(candidate);
                }
            }
        });
    });
}

// Initialize local media stream
async function initLocalStream() {
    try {
        debugLog('Requesting camera and microphone...', 'info');
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
        });
        localVideo.srcObject = localStream;
        window.localStream = localStream;
        debugLog('✓ Local stream initialized', 'success');
        return true;
    } catch (error) {
        debugLog(`✗ Media error: ${error.message}`, 'error');
        window.showModal('Permission Denied', 'Could not access camera/microphone. Please grant permissions.', 'fa-video-slash');
        return false;
    }
}

// Create peer connection
function createPeerConnection() {
    debugLog('Creating peer connection...', 'info');
    peerConnection = new RTCPeerConnection(configuration);
    
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    
    peerConnection.ontrack = event => {
        debugLog(`Received ${event.track.kind} track`, 'success');
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
    };
    
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            debugLog(`ICE candidate: ${event.candidate.type}`, 'info');
            const candidateRef = ref(database, `calls/${roomId}/candidates/${isCreator ? 'caller' : 'callee'}/${Date.now()}`);
            set(candidateRef, event.candidate.toJSON());
        }
    };
    
    peerConnection.onconnectionstatechange = () => {
        debugLog(`Connection: ${peerConnection.connectionState}`, 'warning');
        if (peerConnection.connectionState === 'connected') {
            debugLog('✓ Connected!', 'success');
            showVideoCallScreen();
        } else if (peerConnection.connectionState === 'failed') {
            debugLog('✗ Connection failed', 'error');
            window.showModal('Connection Failed', 'Connection failed. Please try again.', 'fa-exclamation-triangle');
            hangup();
        } else if (peerConnection.connectionState === 'disconnected') {
            debugLog('⚠ Connection disconnected', 'warning');
            setTimeout(() => {
                if (peerConnection && peerConnection.connectionState === 'disconnected') {
                    debugLog('Connection still disconnected, hanging up', 'error');
                    window.showModal('Connection Lost', 'The connection was lost. Please try again.', 'fa-wifi');
                    hangup();
                }
            }, 3000); // Wait 3 seconds for reconnection
        } else if (peerConnection.connectionState === 'closed') {
            debugLog('Connection closed', 'info');
        }
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        debugLog(`ICE: ${peerConnection.iceConnectionState}`, 'warning');
    };
}

// Show video call screen
function showVideoCallScreen() {
    document.getElementById('callingScreen').classList.remove('active');
    document.getElementById('videoCallScreen').classList.add('active');
    
    // Record call start time
    callStartTime = Date.now();
    debugLog('Call connected, recording start time', 'info');
    
    // Start duration timer
    startDurationTimer();
}

// Start call duration timer
function startDurationTimer() {
    // Clear any existing timer
    if (durationInterval) {
        clearInterval(durationInterval);
    }
    
    const durationElement = document.getElementById('callDurationText');
    if (!durationElement) return;
    
    durationInterval = setInterval(() => {
        if (!callStartTime) {
            clearInterval(durationInterval);
            return;
        }
        
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        durationElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// Stop call duration timer
function stopDurationTimer() {
    if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
    }
}

// Hang up
window.hangup = async function() {
    debugLog('Hanging up...', 'warning');
    
    // Calculate call duration if call was connected
    let duration = 0;
    if (callStartTime) {
        duration = Math.floor((Date.now() - callStartTime) / 1000); // in seconds
        debugLog(`Call duration: ${duration} seconds`, 'info');
    }
    
    // Store roomId before clearing it
    const currentRoomId = roomId;
    const wasConnected = callStartTime !== null;
    
    // Save to call history if call was connected
    if (wasConnected && currentUser && partnerUser) {
        await saveCallHistory({
            partner: partnerUser.name,
            type: isCreator ? 'outgoing' : 'incoming',
            duration: duration,
            timestamp: Date.now(),
            status: 'completed'
        });
    }
    
    // Reset call start time
    callStartTime = null;
    
    // Stop duration timer
    stopDurationTimer();
    
    // Notify Firebase that call is ending
    if (currentRoomId) {
        try {
            const callRef = ref(database, `calls/${currentRoomId}`);
            await update(callRef, { status: 'ended' });
            debugLog('✓ Call status updated to ended', 'success');
            
            // Cancel the onDisconnect handler since we're manually ending
            const callDisconnectRef = onDisconnect(callRef);
            await callDisconnectRef.cancel();
        } catch (error) {
            debugLog(`Error updating call status: ${error.message}`, 'error');
        }
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        debugLog('✓ Peer connection closed', 'success');
    }
    
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            debugLog(`Stopped ${track.kind} track`, 'info');
        });
        localStream = null;
    }
    
    // Clear video elements
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    remoteStream = null;
    window.localStream = null;
    
    // Hide local video container and reopen button
    document.getElementById('localVideoContainer').classList.remove('hidden');
    document.getElementById('reopenPreviewBtn').classList.remove('visible');
    
    // Remove call data from Firebase
    if (currentRoomId) {
        setTimeout(async () => {
            try {
                const callRef = ref(database, `calls/${currentRoomId}`);
                await remove(callRef);
                debugLog('✓ Call data removed from Firebase', 'success');
            } catch (error) {
                debugLog(`Error removing call data: ${error.message}`, 'error');
            }
        }, 1000); // Wait 1 second to ensure other user sees "ended" status
        roomId = null;
    }
    
    isCreator = false;
    pendingCandidates = [];
    
    // Return to dashboard
    document.getElementById('callingScreen').classList.remove('active');
    document.getElementById('videoCallScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    
    // Ensure header is visible when returning to dashboard
    const header = document.querySelector('.header');
    if (header) header.classList.remove('hidden-in-call');
    
    // Restart partner status checking - force refresh
    setTimeout(() => {
        checkPartnerStatus();
    }, 500);
    
    debugLog('✓ Call ended, returned to dashboard', 'success');
};

// Logout
window.logout = async function(switchingProfile = false) {
    debugLog('Logging out...', 'info');
    
    stopStatusCheck();
    
    // Remove partner status listener
    if (partnerStatusListener) {
        partnerStatusListener();
        partnerStatusListener = null;
    }
    
    // Remove call history listener
    if (callHistoryListener) {
        callHistoryListener();
        callHistoryListener = null;
    }
    
    // Only set offline if not switching profiles (closing browser/tab)
    if (currentUser && !switchingProfile) {
        const userStatusRef = ref(database, `users/${currentUser.name}/status`);
        await set(userStatusRef, {
            online: false,
            lastSeen: Date.now()
        });
    }
    
    // Clear current user data
    currentUser = null;
    partnerUser = null;
    
    // Reset UI
    document.getElementById('userInfo').classList.remove('visible');
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.remove('hidden');
    
    // Clear history list
    const historyList = document.getElementById('historyList');
    if (historyList) {
        historyList.innerHTML = `
            <div class="history-empty">
                <i class="fas fa-phone"></i>
                <div>No call history yet</div>
            </div>
        `;
    }
    
    debugLog('✓ Logged out', 'success');
};

// ─── CALL HISTORY ────────────────────────────────────────────

// Save call to history
async function saveCallHistory(callData) {
    if (!currentUser) return;
    
    try {
        const historyRef = ref(database, `history/${currentUser.name}/${Date.now()}`);
        await set(historyRef, callData);
        debugLog('✓ Call saved to history', 'success');
    } catch (error) {
        debugLog(`Error saving call history: ${error.message}`, 'error');
    }
}

// Load call history
function loadCallHistory() {
    if (!currentUser) return;
    
    debugLog('Loading call history...', 'info');
    
    // Remove previous listener if exists
    if (callHistoryListener) {
        callHistoryListener();
    }
    
    const historyRef = ref(database, `history/${currentUser.name}`);
    callHistoryListener = onValue(historyRef, (snapshot) => {
        const historyList = document.getElementById('historyList');
        const data = snapshot.val();
        
        if (!data) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-phone"></i>
                    <div>No call history yet</div>
                </div>
            `;
            return;
        }
        
        // Convert to array and sort by timestamp (newest first)
        const calls = Object.entries(data)
            .map(([id, call]) => ({ id, ...call }))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20); // Show last 20 calls
        
        historyList.innerHTML = calls.map(call => {
            let activityText = '';
            let icon = '';
            
            // Determine activity text and icon based on call type and status
            if (call.type === 'outgoing') {
                icon = 'fa-arrow-up';
                activityText = 'You called';
            } else if (call.type === 'incoming') {
                icon = 'fa-arrow-down';
                activityText = 'Called you';
            } else if (call.type === 'missed') {
                icon = 'fa-phone-slash';
                if (call.status === 'missed') {
                    activityText = 'You declined';
                } else {
                    activityText = 'Missed call';
                }
            }
            
            const timeStr = formatCallTime(call.timestamp);
            const durationStr = formatDuration(call.duration);
            
            return `
                <div class="history-item">
                    <div class="history-icon ${call.type}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="history-details">
                        <div class="history-name">${call.partner}</div>
                        <div class="history-meta">
                            <span class="history-activity">${activityText}</span>
                            <span>•</span>
                            <span class="history-time">
                                <i class="fas fa-clock" style="font-size:10px;"></i>
                                ${timeStr}
                            </span>
                            ${call.duration > 0 ? `
                                <span>•</span>
                                <span class="history-duration">
                                    <i class="fas fa-stopwatch" style="font-size:10px;"></i>
                                    ${durationStr}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        debugLog(`✓ Loaded ${calls.length} call history items`, 'success');
    });
}

// Format call timestamp
function formatCallTime(timestamp) {
    const now = new Date();
    const callDate = new Date(timestamp);
    const diffMs = now - callDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format call duration
function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// Clear call history
window.clearHistory = async function() {
    if (!currentUser) return;
    
    if (!confirm('Are you sure you want to clear all call history?')) return;
    
    try {
        const historyRef = ref(database, `history/${currentUser.name}`);
        await remove(historyRef);
        debugLog('✓ Call history cleared', 'success');
    } catch (error) {
        debugLog(`Error clearing history: ${error.message}`, 'error');
        window.showModal('Error', 'Failed to clear call history.', 'fa-exclamation-triangle');
    }
};

// Initialize
debugLog('App initialized', 'success');
window.localStream = null;

// Handle page unload/refresh during call
window.addEventListener('beforeunload', async (e) => {
    if (roomId && peerConnection) {
        // User is in an active call
        debugLog('Page unloading during active call, cleaning up...', 'warning');
        
        try {
            // Mark call as ended in Firebase
            const callRef = ref(database, `calls/${roomId}`);
            await update(callRef, { status: 'ended' });
            
            // Clean up peer connection
            if (peerConnection) {
                peerConnection.close();
            }
            
            // Stop local stream
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        } catch (error) {
            debugLog(`Error during cleanup: ${error.message}`, 'error');
        }
    }
    
    // Update user status to offline (only on actual page close, not profile switch)
    if (currentUser) {
        try {
            const userStatusRef = ref(database, `users/${currentUser.name}/status`);
            await set(userStatusRef, {
                online: false,
                lastSeen: Date.now()
            });
        } catch (error) {
            debugLog(`Error updating status: ${error.message}`, 'error');
        }
    }
});

// Handle visibility change (tab switch, minimize)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        debugLog('Page hidden', 'info');
    } else {
        debugLog('Page visible', 'info');
        // Refresh partner status when user returns
        if (currentUser && partnerUser) {
            checkPartnerStatus();
        }
    }
});
