(function () {
    'use strict';

    var RATE_LIMIT_KEY = 'skyview:portal-attempts:v1';
    var MAX_ATTEMPTS = 5;
    var LOCKOUT_MS = 15 * 60 * 1000;

    var form = document.getElementById('loginForm');
    var errorMessage = document.getElementById('errorMessage');
    var warningMessage = document.getElementById('warningMessage');
    var loginView = document.getElementById('loginView');
    var loadingView = document.getElementById('loadingView');
    var submitBtn = document.getElementById('submitBtn');
    var attemptCounter = document.getElementById('attemptCounter');

    function getAttemptState() {
        try {
            var raw = localStorage.getItem(RATE_LIMIT_KEY);
            if (!raw) return { count: 0, lockedUntil: null };
            return JSON.parse(raw);
        } catch {
            return { count: 0, lockedUntil: null };
        }
    }

    function saveAttemptState(state) {
        try {
            localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
        } catch { /* ignore localStorage errors */ }
    }

    function recordFailedAttempt() {
        var state = getAttemptState();
        state.count = (state.count || 0) + 1;
        if (state.count >= MAX_ATTEMPTS) {
            state.lockedUntil = Date.now() + LOCKOUT_MS;
        }
        saveAttemptState(state);
        return state;
    }

    function clearAttempts() {
        try { localStorage.removeItem(RATE_LIMIT_KEY); } catch { /* ignore localStorage errors */ }
    }

    function isLockedOut() {
        var state = getAttemptState();
        if (!state.lockedUntil) return false;
        if (Date.now() < state.lockedUntil) return true;
        clearAttempts();
        return false;
    }

    function getLockoutMinutesRemaining() {
        var state = getAttemptState();
        if (!state.lockedUntil) return 0;
        return Math.ceil((state.lockedUntil - Date.now()) / 60000);
    }

    function updateAttemptUI() {
        var state = getAttemptState();
        var remaining = MAX_ATTEMPTS - (state.count || 0);
        if (state.count > 0 && remaining > 0 && remaining < MAX_ATTEMPTS) {
            attemptCounter.textContent = remaining + ' attempt' + (remaining === 1 ? '' : 's') + ' remaining';
        } else {
            attemptCounter.textContent = '';
        }
    }

    // Token expiry: format clientId.expiry_unix_seconds.signature
    function parseTokenExpiry(code) {
        var parts = code.split('.');
        if (parts.length < 2) return null;
        var expiry = parseInt(parts[1], 10);
        return isFinite(expiry) ? expiry : null;
    }

    function isTokenExpired(code) {
        var expiry = parseTokenExpiry(code);
        if (!expiry) return false;
        return Math.floor(Date.now() / 1000) > expiry;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        setTimeout(function () { errorMessage.classList.remove('show'); }, 7000);
    }

    function showWarning(message) {
        warningMessage.textContent = message;
        warningMessage.classList.add('show');
    }

    function setLocked(locked) {
        submitBtn.disabled = locked;
        document.getElementById('accessCode').disabled = locked;
        submitBtn.textContent = locked ? 'Too many attempts' : 'Access Your Files';
    }

    var lockoutTimer = null;

    // Lock the form and keep one timer that unlocks it when the lockout ends.
    // Used at startup and when a failed submission triggers a lockout.
    function startLockout() {
        var mins = getLockoutMinutesRemaining();
        showWarning('Too many failed attempts. Please wait ' + mins + ' minute' + (mins === 1 ? '' : 's') + ' before trying again.');
        setLocked(true);
        if (lockoutTimer !== null) return;
        lockoutTimer = setInterval(function () {
            if (!isLockedOut()) {
                clearInterval(lockoutTimer);
                lockoutTimer = null;
                setLocked(false);
                warningMessage.classList.remove('show');
                clearAttempts();
                updateAttemptUI();
            } else {
                var m = getLockoutMinutesRemaining();
                showWarning('Too many failed attempts. Please wait ' + m + ' minute' + (m === 1 ? '' : 's') + ' before trying again.');
            }
        }, 30000);
    }

    function checkInitialLockout() {
        if (isLockedOut()) startLockout();
        updateAttemptUI();
    }

    // Server-side verification (HMAC-SHA256, PORTAL_SALT-keyed — see
    // netlify/functions/api-portal.mjs). Client-side checks below
    // (expiry parsing, rate limiting) are defense-in-depth UX only;
    // the server call is the actual access decision and fails
    // closed on any network error or non-2xx response.
    function verifyAccessCode(code) {
        return fetch('/api/portal/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        }).then(function (response) {
            if (response.status === 503) {
                return { valid: false, unavailable: true };
            }
            if (!response.ok) {
                return { valid: false };
            }
            return response.json().then(function (data) {
                return { valid: !!data.valid, clientId: data.clientId, sessionToken: data.sessionToken };
            });
        }).catch(function () {
            // Network/parse failure — fail closed, do not grant access.
            return { valid: false, unavailable: true };
        });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (isLockedOut()) {
            var mins = getLockoutMinutesRemaining();
            showError('Account locked. Please wait ' + mins + ' minute' + (mins === 1 ? '' : 's') + '.');
            return;
        }

        var accessCode = document.getElementById('accessCode').value.trim();

        if (!accessCode) {
            showError('Please enter your access code.');
            return;
        }

        if (isTokenExpired(accessCode)) {
            showError('This access link has expired. Please contact us to request a new one.');
            recordFailedAttempt();
            updateAttemptUI();
            return;
        }

        loginView.style.display = 'none';
        loadingView.classList.add('show');

        verifyAccessCode(accessCode).then(function (result) {
            loadingView.classList.remove('show');

            if (result.valid) {
                clearAttempts();

                if (!result.sessionToken) {
                    // Defensive fallback only — the server always issues a
                    // session token on a valid code. Never fall back to
                    // sending the raw access code onward.
                    loginView.style.display = 'block';
                    showError('Unable to start your session. Please try again.');
                    updateAttemptUI();
                    return;
                }

                // Deliver the short-lived session token via a URL fragment,
                // not a query param: fragments are never sent to the server
                // and never appear in server/referrer logs, unlike the old
                // ?code=<access-code> redirect (CWE-598, PR #121 review).
                window.location.href = '/pages/client-gallery.html#session=' + encodeURIComponent(result.sessionToken);
                return;
            }

            loginView.style.display = 'block';

            if (result.unavailable) {
                showError('Portal verification is temporarily unavailable. Please try again shortly or contact us.');
                updateAttemptUI();
                return;
            }

            var state = recordFailedAttempt();
            updateAttemptUI();

            if (isLockedOut()) {
                startLockout();
                var lockMins = getLockoutMinutesRemaining();
                showError('Too many failed attempts. Please wait ' + lockMins + ' minute' + (lockMins === 1 ? '' : 's') + ' before trying again.');
                showWarning('Account temporarily locked after ' + MAX_ATTEMPTS + ' failed attempts.');
            } else {
                var remaining = MAX_ATTEMPTS - state.count;
                showError('Invalid access code. Please check your email or contact us for help.' +
                    (remaining > 0 ? ' (' + remaining + ' attempt' + (remaining === 1 ? '' : 's') + ' remaining)' : ''));
            }
        });
    });

    // Auto-fill from URL param (email link flow)
    var urlParams = new URLSearchParams(window.location.search);
    var codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
        // Drop the code from the address bar and history entry before anything else.
        urlParams.delete('code');
        var remainingQuery = urlParams.toString();
        try {
            window.history.replaceState(null, '', window.location.pathname + (remainingQuery ? '?' + remainingQuery : '') + window.location.hash);
        } catch { /* ignore history errors */ }
        document.getElementById('accessCode').value = codeFromUrl;
        if (isTokenExpired(codeFromUrl)) {
            showError('This access link has expired. Please contact us to request a new one.');
        } else {
            form.dispatchEvent(new Event('submit'));
        }
    }

    checkInitialLockout();
})();