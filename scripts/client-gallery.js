(function () {
    'use strict';

    var SESSION_STORAGE_KEY = 'skyview:portal-session:v1';

    var galleryContainer = document.getElementById('clientGallery');
    var projectNameEl = document.getElementById('projectName');
    var projectDateEl = document.getElementById('projectDate');
    var filterButtons = document.querySelectorAll('.filter-button');
    var downloadAllBtn = document.getElementById('downloadAll');
    var logoutLink = document.getElementById('logoutLink');

    function clearSession() {
        try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore sessionStorage errors */ }
    }

    function redirectToLogin() {
        clearSession();
        window.location.href = '/pages/client-portal.html';
    }

    // Session tokens arrive here via URL fragment (never sent to the
    // server or logged), not a query param — see pages/client-portal.html.
    // A same-tab refresh is served from sessionStorage instead of
    // re-hitting the login flow, still without ever touching the URL.
    function getSessionToken() {
        if (window.location.hash) {
            var match = /(?:^#|[?&])session=([^&]+)/.exec(window.location.hash);
            if (match) {
                var token;
                try {
                    token = decodeURIComponent(match[1]);
                } catch {
                    // Malformed percent-encoding (e.g. a bare "%").
                    // Scrub the bad fragment and fall through to the
                    // sessionStorage/redirect-to-login path below.
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                    return null;
                }
                try { sessionStorage.setItem(SESSION_STORAGE_KEY, token); } catch { /* ignore sessionStorage errors */ }
                // Scrub the token out of the visible URL/history immediately.
                history.replaceState(null, '', window.location.pathname + window.location.search);
                return token;
            }
        }
        try {
            return sessionStorage.getItem(SESSION_STORAGE_KEY);
        } catch {
            return null;
        }
    }

    var sessionToken = getSessionToken();
    if (!sessionToken) {
        redirectToLogin();
        return;
    }

    function authHeaders() {
        return { Authorization: 'Bearer ' + sessionToken };
    }

    function typeIcon(type) {
        if (type === 'video') return '▶️';
        if (type === 'raw') return '🗂️';
        return '🖼️';
    }

    function applyFilter(filter) {
        galleryContainer.querySelectorAll('.client-gallery-item').forEach(function (item) {
            item.style.display = (filter === 'all' || item.dataset.type === filter) ? 'block' : 'none';
        });
    }

    function currentFilter() {
        var active = document.querySelector('.filter-button.active');
        return active ? active.dataset.filter : 'all';
    }

    function openFile(fileId, download) {
        fetch('/api/portal/download?file=' + encodeURIComponent(fileId), { headers: authHeaders() })
            .then(function (response) {
                if (response.status === 401 || response.status === 403) {
                    redirectToLogin();
                    return null;
                }
                if (!response.ok) throw new Error('download_link_unavailable');
                return response.json();
            })
            .then(function (data) {
                if (!data) return;
                if (download) {
                    var link = document.createElement('a');
                    link.href = data.url;
                    link.download = data.fileName || '';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                } else {
                    window.open(data.url, '_blank', 'noopener');
                }
            })
            .catch(function () {
                alert('Could not generate a download link. Please refresh and try again.');
            });
    }

    function renderManifest(manifest) {
        projectNameEl.textContent = manifest.projectName || 'Your Project Gallery';
        projectDateEl.textContent = manifest.deliveredAt ? ('Delivered: ' + manifest.deliveredAt) : '';

        var files = manifest.files || [];
        galleryContainer.innerHTML = '';

        if (files.length === 0) {
            galleryContainer.innerHTML = '<div class="gallery-empty-state">No files have been delivered yet.</div>';
            return;
        }

        files.forEach(function (file) {
            var item = document.createElement('div');
            item.className = 'client-gallery-item';
            item.dataset.type = file.type;

            var thumb = document.createElement('div');
            thumb.className = 'client-gallery-item-thumb';
            thumb.textContent = typeIcon(file.type);

            var info = document.createElement('div');
            info.className = 'client-gallery-item-info';

            var title = document.createElement('div');
            title.className = 'client-gallery-item-title';
            title.textContent = file.title;

            var meta = document.createElement('div');
            meta.className = 'client-gallery-item-meta';
            meta.textContent = file.meta || '';

            var actions = document.createElement('div');
            actions.className = 'item-actions';

            var viewBtn = document.createElement('a');
            viewBtn.href = '#';
            viewBtn.className = 'action-button';
            viewBtn.textContent = '👁️ View';
            viewBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openFile(file.id, false);
            });

            var downloadBtn = document.createElement('a');
            downloadBtn.href = '#';
            downloadBtn.className = 'action-button';
            downloadBtn.textContent = '⬇️ Download';
            downloadBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openFile(file.id, true);
            });

            actions.appendChild(viewBtn);
            actions.appendChild(downloadBtn);
            info.appendChild(title);
            info.appendChild(meta);
            info.appendChild(actions);
            item.appendChild(thumb);
            item.appendChild(info);
            galleryContainer.appendChild(item);
        });

        applyFilter(currentFilter());
    }

    function loadManifest() {
        fetch('/api/portal/files', { headers: authHeaders() })
            .then(function (response) {
                if (response.status === 401 || response.status === 403) {
                    redirectToLogin();
                    return null;
                }
                if (!response.ok) throw new Error('manifest_unavailable');
                return response.json();
            })
            .then(function (manifest) {
                if (manifest) renderManifest(manifest);
            })
            .catch(function () {
                galleryContainer.innerHTML = '<div class="gallery-empty-state">Could not load your files. Please try again shortly.</div>';
            });
    }

    filterButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            filterButtons.forEach(function (btn) { btn.classList.remove('active'); });
            button.classList.add('active');
            applyFilter(button.dataset.filter);
        });
    });

    downloadAllBtn.addEventListener('click', function (e) {
        e.preventDefault();
        alert('Bulk ZIP download isn\'t available yet — please download files individually below.');
    });

    if (logoutLink) {
        logoutLink.addEventListener('click', function () {
            clearSession();
        });
    }

    loadManifest();
})();