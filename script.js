document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('header');
    if (!header) return;

    function ensureAuthInterface() {
        const rightSection = header.querySelector('.right');

        if (rightSection && !rightSection.querySelector('.auth-trigger')) {
            rightSection.insertAdjacentHTML('beforeend', `
                <button class="auth-trigger tab" type="button" aria-controls="auth-panel" aria-expanded="false" aria-haspopup="dialog">
                    LOG IN
                </button>
            `);
        }

        if (!document.querySelector('.auth-overlay')) {
            header.insertAdjacentHTML('afterend', `
                <div class="auth-overlay" aria-hidden="true"></div>
            `);
        }

        if (!document.querySelector('.auth-panel')) {
            const overlay = document.querySelector('.auth-overlay');
            const authPanelAnchor = overlay || header;

            authPanelAnchor.insertAdjacentHTML('afterend', `
                <section class="auth-panel" id="auth-panel" aria-hidden="true" aria-labelledby="auth-title" role="dialog" aria-modal="true">
                    <button class="auth-close" type="button" aria-label="Close access panel"></button>
                    <h2 id="auth-title">login to trivit</h2>
                    <form class="auth-form" id="auth-login-form" data-auth-mode="login">
                        <label class="auth-field" for="auth-email">
                            <span class="auth-field-label">email</span>
                            <input id="auth-email" name="email" type="email" autocomplete="email" required>
                        </label>
                        <label class="auth-field" for="auth-password">
                            <span class="auth-field-label">password</span>
                            <input id="auth-password" name="password" type="password" autocomplete="current-password" required>
                        </label>
                        <button class="auth-submit" type="submit">LOG IN</button>
                        <div class="auth-provider-separator" aria-hidden="true">or</div>
                        <button class="auth-google-button" type="button">LOG IN WITH GOOGLE</button>
                        <div class="auth-mode-switch">
                            <span class="auth-mode-label">DON'T HAVE AN ACCOUNT?</span>
                            <button class="auth-mode-toggle" type="button">SIGN IN</button>
                        </div>
                        <p class="auth-feedback" role="status" aria-live="polite"></p>
                    </form>
                </section>
            `);
        }

        if (!document.querySelector('.account-panel')) {
            const authPanel = document.querySelector('.auth-panel');
            const accountPanelAnchor = authPanel || document.querySelector('.auth-overlay') || header;

            accountPanelAnchor.insertAdjacentHTML('afterend', `
                <section class="account-panel" id="account-panel" aria-hidden="true" aria-labelledby="account-title" role="dialog" aria-modal="true">
                    <button class="account-close" type="button" aria-label="Close account menu"></button>
                    <h2 id="account-title">hello</h2>
                    <p class="account-copy">Choose what you want to open next.</p>
                    <div class="account-menu-list">
                        <button class="account-menu-item" type="button">Profile</button>
                        <button class="account-menu-item" type="button">Saved Items</button>
                        <button class="account-menu-item" type="button">Downloads</button>
                        <button class="account-menu-item" type="button">Settings</button>
                        <button class="account-menu-item account-menu-logout" type="button">Log Out</button>
                    </div>
                    <p class="account-feedback" role="status" aria-live="polite"></p>
                </section>
            `);
        }
    }

    function ensureAuthModule() {
        const hasAuthModule = Array.from(document.querySelectorAll('script[type="module"][src]'))
            .some(script => /(^|\/)auth\.js$/i.test(new URL(script.src, window.location.href).pathname));

        if (hasAuthModule) {
            return;
        }

        const currentScript = Array.from(document.querySelectorAll('script[src]'))
            .find(script => /(^|\/)script\.js$/i.test(new URL(script.src, window.location.href).pathname));
        const moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.src = new URL('auth.js', currentScript ? currentScript.src : window.location.href).href;
        moduleScript.dataset.trivitAuthModule = 'true';
        document.body.appendChild(moduleScript);
    }

    ensureAuthInterface();
    ensureAuthModule();

    const selector = document.querySelector('.tab-selector');
    const items = Array.from(document.querySelectorAll('header .tab'));
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar ? searchBar.querySelector('input') : null;
    const authTrigger = document.querySelector('.auth-trigger');
    const authPanel = document.querySelector('.auth-panel');
    const accountPanel = document.querySelector('.account-panel');
    const authOverlay = document.querySelector('.auth-overlay');
    const authClose = document.querySelector('.auth-close');
    const accountClose = document.querySelector('.account-close');
    const authForm = document.querySelector('#auth-login-form');
    const authTitle = document.querySelector('#auth-title');
    const authCopy = document.querySelector('.auth-copy');
    const authSubmit = document.querySelector('.auth-submit');
    const authGoogleButton = document.querySelector('.auth-google-button');
    const authModeLabel = document.querySelector('.auth-mode-label');
    const authModeToggle = document.querySelector('.auth-mode-toggle');
    const accountFeedback = document.querySelector('.account-feedback');
    const accountLogoutButton = document.querySelector('.account-menu-logout');
    let isAuthenticated = false;
    let isLogoutPending = false;
    let navigationToken = 0;
    let lastHeaderSelection = document.querySelector('header .tab.active') || null;
    const nonDraggableElements = Array.from(document.querySelectorAll(
        'header .tabs li, header .tab-link, .auth-trigger, footer .footer-tabs li, footer .footer-tabs a'
    ));

    nonDraggableElements.forEach(element => {
        element.setAttribute('draggable', 'false');
    });

    const authModeConfig = {
        login: {
            title: 'login to trivit',
            submit: 'LOG IN',
            google: 'LOG IN WITH GOOGLE',
            switchLabel: 'DON\'T HAVE AN ACCOUNT?',
            switchAction: 'SIGN IN'
        },
        register: {
            title: 'sign in to trivit',
            submit: 'SIGN IN',
            google: 'SIGN IN WITH GOOGLE',
            switchLabel: 'ALREADY HAVE AN ACCOUNT?',
            switchAction: 'LOG IN'
        }
    };

    function getSearchTargetWidth() {
        return window.innerWidth <= 820 ? Math.min(286, window.innerWidth * 0.7) : 286;
    }

    function getCurrentAuthMode() {
        return authForm?.dataset.authMode === 'register' ? 'register' : 'login';
    }

    function isAuthPanelOpen() {
        return Boolean(authPanel?.classList.contains('is-open'));
    }

    function isAccountPanelOpen() {
        return Boolean(accountPanel?.classList.contains('is-open'));
    }

    function syncPanelOverlayState() {
        const hasOpenPanel = isAuthPanelOpen() || isAccountPanelOpen();

        if (authOverlay) {
            authOverlay.classList.toggle('is-open', hasOpenPanel);
            authOverlay.setAttribute('aria-hidden', hasOpenPanel ? 'false' : 'true');
        }

        if (authTrigger) {
            authTrigger.setAttribute('aria-expanded', hasOpenPanel ? 'true' : 'false');
        }

        document.body.classList.toggle('auth-open', hasOpenPanel);
    }

    function syncAuthTriggerUi() {
        if (!authTrigger) return;

        authTrigger.textContent = isAuthenticated ? 'You' : 'LOG IN';
        authTrigger.setAttribute('aria-label', isAuthenticated ? 'You' : 'Log in');
        authTrigger.setAttribute('aria-controls', isAuthenticated ? 'account-panel' : 'auth-panel');
        syncPanelAnimationOrigins();
    }

    function setAccountFeedback(message, state = '') {
        if (!accountFeedback) return;

        accountFeedback.textContent = message;
        if (state) {
            accountFeedback.dataset.state = state;
        } else {
            delete accountFeedback.dataset.state;
        }
    }

    function setLogoutButtonState(isPending) {
        if (!accountLogoutButton) return;

        isLogoutPending = isPending;
        accountLogoutButton.disabled = isPending;
        accountLogoutButton.textContent = isPending ? 'Logging Out...' : 'Log Out';
    }

    function syncAuthModeUi(mode) {
        if (!authForm) return;

        const nextMode = mode === 'register' ? 'register' : 'login';
        authForm.dataset.authMode = nextMode;

        if (authPanel) {
            authPanel.dataset.authMode = nextMode;
        }

        if (authTitle) {
            authTitle.textContent = authModeConfig[nextMode].title;
        }

        if (authCopy) {
            authCopy.textContent = authModeConfig[nextMode].copy;
        }

        if (authSubmit && !authSubmit.disabled) {
            authSubmit.textContent = authModeConfig[nextMode].submit;
        }

        if (authGoogleButton && !authGoogleButton.disabled) {
            authGoogleButton.textContent = authModeConfig[nextMode].google;
        }

        if (authModeLabel) {
            authModeLabel.textContent = authModeConfig[nextMode].switchLabel;
        }

        if (authModeToggle && !authModeToggle.disabled) {
            authModeToggle.textContent = authModeConfig[nextMode].switchAction;
        }
    }

    function updateAuthPanelOffset() {
        if (!header) return;
        document.documentElement.style.setProperty('--auth-panel-top', `${header.offsetHeight + 18}px`);
        syncPanelAnimationOrigins();
    }

    function getPanelLeftPosition(panel, panelStyles) {
        const declaredLeft = Number.parseFloat(panelStyles.left);
        if (!Number.isNaN(declaredLeft)) {
            return declaredLeft;
        }

        const declaredRight = Number.parseFloat(panelStyles.right);
        if (!Number.isNaN(declaredRight)) {
            return window.innerWidth - declaredRight - panel.offsetWidth;
        }

        return panel.getBoundingClientRect().left;
    }

    function updatePanelAnimationOrigin(panel) {
        if (!panel || !authTrigger) return;

        const triggerRect = authTrigger.getBoundingClientRect();
        const panelStyles = window.getComputedStyle(panel);
        const panelTop = Number.parseFloat(panelStyles.top);
        const panelLeft = getPanelLeftPosition(panel, panelStyles);

        if (Number.isNaN(panelTop) || Number.isNaN(panelLeft)) {
            return;
        }

        const originX = triggerRect.left + (triggerRect.width / 2) - panelLeft;
        const originY = triggerRect.top + (triggerRect.height / 2) - panelTop;

        panel.style.setProperty('--panel-origin-x', `${originX}px`);
        panel.style.setProperty('--panel-origin-y', `${originY}px`);
    }

    function syncPanelAnimationOrigins() {
        updatePanelAnimationOrigin(authPanel);
        updatePanelAnimationOrigin(accountPanel);
    }

    function showSelector() {
        if (selector) {
            selector.classList.add('is-visible');
        }
    }

    function hideSelector() {
        if (selector) {
            selector.classList.remove('is-visible');
        }
    }

    function enableSelectorAnimation() {
        if (selector) {
            selector.classList.add('is-ready');
        }
    }

    function getHeaderContentOffset() {
        if (!header) {
            return { left: 0, top: 0 };
        }

        // Absolute children are positioned from the header's inner box, not its outer border box.
        return {
            left: header.clientLeft,
            top: header.clientTop
        };
    }

    function updateSelector(activeEl) {
        if (!activeEl || !selector || !header) return;

        const headerRect = header.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const headerOffset = getHeaderContentOffset();
        const top = activeRect.top - headerRect.top - headerOffset.top;
        const height = activeRect.height;

        selector.style.top = `${top}px`;
        selector.style.height = `${height}px`;

        if (activeEl === searchBar && searchInput) {
            const targetWidth = getSearchTargetWidth();
            const left = activeRect.right - headerRect.left - headerOffset.left - targetWidth;
            selector.style.transform = `translateX(${left}px)`;
            selector.style.width = `${targetWidth}px`;
            showSelector();
            return;
        }

        const left = activeRect.left - headerRect.left - headerOffset.left;
        selector.style.transform = `translateX(${left}px)`;
        selector.style.width = `${activeRect.width}px`;
        showSelector();
    }

    function clearHeaderState() {
        items.forEach(item => item.classList.remove('active'));

        if (searchBar) {
            searchBar.classList.remove('active');
        }

        lastHeaderSelection = null;
        hideSelector();
    }

    function setActive(activeEl) {
        if (!activeEl) {
            clearHeaderState();
            return;
        }

        items.forEach(item => {
            if (item !== activeEl) {
                item.classList.remove('active');
            }
        });

        activeEl.classList.add('active');

        if (activeEl !== authTrigger) {
            lastHeaderSelection = activeEl;
        }

        if (activeEl === searchBar) {
            requestAnimationFrame(() => updateSelector(activeEl));
            return;
        }

        if (searchBar) {
            searchBar.classList.remove('active');
        }

        updateSelector(activeEl);
    }

    function getCurrentActiveHeaderItem() {
        return document.querySelector('header .tab.active');
    }

    function openAuthPanel() {
        if (!authPanel || !authTrigger) return;

        if (isAccountPanelOpen()) {
            closeAccountPanel({ restoreSelection: false });
        }

        updatePanelAnimationOrigin(authPanel);
        authPanel.classList.add('is-open');
        authPanel.setAttribute('aria-hidden', 'false');
        syncPanelOverlayState();
        syncAuthModeUi('login');
        document.dispatchEvent(new CustomEvent('trivit:auth-panel-open'));
    }

    function closeAuthPanel(options = {}) {
        const { restoreSelection = true } = options;

        if (!authPanel || !authTrigger) return;

        updatePanelAnimationOrigin(authPanel);
        authPanel.classList.remove('is-open');
        authPanel.setAttribute('aria-hidden', 'true');
        syncPanelOverlayState();
        document.dispatchEvent(new CustomEvent('trivit:auth-panel-close'));

        if (!restoreSelection) {
            return;
        }

        if (lastHeaderSelection && document.contains(lastHeaderSelection)) {
            setActive(lastHeaderSelection);
            return;
        }

        clearHeaderState();
    }

    function openAccountPanel() {
        if (!accountPanel || !authTrigger || !isAuthenticated) return;

        if (isAuthPanelOpen()) {
            closeAuthPanel({ restoreSelection: false });
        }

        setAccountFeedback('');
        setLogoutButtonState(false);
        updatePanelAnimationOrigin(accountPanel);
        accountPanel.classList.add('is-open');
        accountPanel.setAttribute('aria-hidden', 'false');
        syncPanelOverlayState();
        document.dispatchEvent(new CustomEvent('trivit:account-panel-open'));
    }

    function closeAccountPanel(options = {}) {
        const { restoreSelection = true } = options;

        if (!accountPanel || !authTrigger) return;

        updatePanelAnimationOrigin(accountPanel);
        accountPanel.classList.remove('is-open');
        accountPanel.setAttribute('aria-hidden', 'true');
        setLogoutButtonState(false);
        setAccountFeedback('');
        syncPanelOverlayState();
        document.dispatchEvent(new CustomEvent('trivit:account-panel-close'));

        if (!restoreSelection) {
            return;
        }

        if (lastHeaderSelection && document.contains(lastHeaderSelection)) {
            setActive(lastHeaderSelection);
            return;
        }

        clearHeaderState();
    }

    function closeOpenPanels(options = {}) {
        const { restoreSelection = true } = options;

        if (isAuthPanelOpen()) {
            closeAuthPanel({ restoreSelection });
            return;
        }

        if (isAccountPanelOpen()) {
            closeAccountPanel({ restoreSelection });
        }
    }

    function syncLinkAttributes(currentLinks, nextLinks) {
        currentLinks.forEach((link, index) => {
            const nextLink = nextLinks[index];
            if (!nextLink) return;

            const href = nextLink.getAttribute('href');
            if (href !== null) {
                link.setAttribute('href', href);
            }

            link.classList.toggle('active', nextLink.classList.contains('active'));
        });
    }

    function syncNavigationFromDocument(nextDocument) {
        const currentLogoLink = document.querySelector('.logo a');
        const nextLogoLink = nextDocument.querySelector('.logo a');

        if (currentLogoLink && nextLogoLink) {
            currentLogoLink.setAttribute('href', nextLogoLink.getAttribute('href'));
        }

        syncLinkAttributes(
            Array.from(document.querySelectorAll('header .tab .tab-link')),
            Array.from(nextDocument.querySelectorAll('header .tab .tab-link'))
        );

        syncLinkAttributes(
            Array.from(document.querySelectorAll('footer .footer-tabs a')),
            Array.from(nextDocument.querySelectorAll('footer .footer-tabs a'))
        );

        const nextActiveTabKey = nextDocument.querySelector('header .tab.active')?.dataset.tab;
        const nextActiveTab = items.find(item => item.dataset.tab === nextActiveTabKey);

        if (nextActiveTab) {
            setActive(nextActiveTab);
        } else {
            clearHeaderState();
        }
    }

    function replaceMainContent(nextDocument) {
        const currentMain = document.querySelector('main');
        const nextMain = nextDocument.querySelector('main');

        if (!currentMain || !nextMain) {
            return false;
        }

        currentMain.replaceWith(nextMain.cloneNode(true));
        return true;
    }

    function shouldHandleLink(link, event) {
        if (!link || event.defaultPrevented) return false;
        if (event.button !== 0) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (link.target && link.target !== '_self') return false;
        if (link.hasAttribute('download')) return false;

        const url = new URL(link.href, window.location.href);
        return url.origin === window.location.origin;
    }

    async function navigateTo(url, options = {}) {
        const { pushStateEntry = true } = options;
        const token = ++navigationToken;

        try {
            const response = await fetch(url.href, {
                headers: {
                    'X-Requested-With': 'trivit-navigation'
                }
            });

            if (!response.ok) {
                throw new Error(`Navigation failed with status ${response.status}`);
            }

            const html = await response.text();
            if (token !== navigationToken) return;

            const nextDocument = new DOMParser().parseFromString(html, 'text/html');
            if (!nextDocument.querySelector('main')) {
                throw new Error('Target page has no main content to swap.');
            }

            if (pushStateEntry) {
                history.pushState({}, '', url.pathname + url.search + url.hash);
            }

            document.title = nextDocument.title || document.title;
            syncNavigationFromDocument(nextDocument);
            replaceMainContent(nextDocument);
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        } catch (error) {
            window.location.href = url.href;
        }
    }

    items.forEach(item => {
        item.addEventListener('click', function() {
            setActive(this);
        });
    });

    const hoverEl = document.querySelector('.tab-hover');

    function showHover(target) {
        if (!hoverEl || !target || !header) return;

        const rect = target.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const headerOffset = getHeaderContentOffset();
        const left = rect.left - headerRect.left - headerOffset.left;
        hoverEl.style.width = `${rect.width}px`;
        hoverEl.style.transform = `translateX(${left}px)`;
        hoverEl.style.opacity = '1';
    }

    function hideHover() {
        if (!hoverEl) return;
        hoverEl.style.opacity = '0';
    }

    items.forEach(item => {
        item.addEventListener('mouseenter', function() {
            showHover(this);
        });

        item.addEventListener('mouseleave', function() {
            setTimeout(() => {
                if (!document.querySelector(':hover') || !items.some(tab => tab.matches(':hover'))) {
                    hideHover();
                }
            }, 50);
        });
    });

    if (header) {
        header.addEventListener('mouseleave', hideHover);
    }

    document.addEventListener('click', function(event) {
        const clickableFooterItem = event.target.closest('footer .footer-tabs li');
        const link = event.target.closest('header a[href], footer a[href]') || clickableFooterItem?.querySelector('a[href]');
        if (!shouldHandleLink(link, event)) return;

        const url = new URL(link.href, window.location.href);
        const currentUrl = new URL(window.location.href);
        const clickedTab = link.closest('header .tab');

        if (clickedTab) {
            setActive(clickedTab);
        }

        if (isAuthPanelOpen() || isAccountPanelOpen()) {
            closeOpenPanels({ restoreSelection: false });
        }

        if (searchInput && document.activeElement === searchInput) {
            searchInput.blur();
        }

        if (url.pathname === currentUrl.pathname && url.search === currentUrl.search && url.hash === currentUrl.hash) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        navigateTo(url);
    });

    if (searchInput) {
        searchBar.addEventListener('pointerdown', () => {
            closeOpenPanels({ restoreSelection: false });
            setActive(searchBar);
        });

        searchInput.addEventListener('focus', () => {
            closeOpenPanels({ restoreSelection: false });
            setActive(searchBar);
        });
    }

    if (authTrigger) {
        authTrigger.addEventListener('click', () => {
            if (isAuthenticated) {
                if (isAccountPanelOpen()) {
                    closeAccountPanel();
                    return;
                }

                setActive(authTrigger);
                updateAuthPanelOffset();
                openAccountPanel();
                return;
            }

            if (isAuthPanelOpen()) {
                closeAuthPanel();
                return;
            }

            setActive(authTrigger);
            updateAuthPanelOffset();
            openAuthPanel();
        });
    }

    if (authModeToggle) {
        authModeToggle.addEventListener('click', () => {
            const nextMode = getCurrentAuthMode() === 'login' ? 'register' : 'login';
            syncAuthModeUi(nextMode);
            document.dispatchEvent(new CustomEvent('trivit:auth-mode-change', {
                detail: { mode: nextMode }
            }));
        });
    }

    if (authClose) {
        authClose.addEventListener('click', () => {
            closeAuthPanel();
        });
    }

    if (accountClose) {
        accountClose.addEventListener('click', () => {
            closeAccountPanel();
        });
    }

    if (authOverlay) {
        authOverlay.addEventListener('click', () => {
            closeOpenPanels();
        });
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && (isAuthPanelOpen() || isAccountPanelOpen())) {
            closeOpenPanels();
        }
    });

    document.addEventListener('trivit:auth-login-success', () => {
        closeAuthPanel();
    });

    document.addEventListener('trivit:auth-state-change', event => {
        isAuthenticated = Boolean(event.detail?.isAuthenticated);
        syncAuthTriggerUi();

        if (isAuthenticated && isAuthPanelOpen()) {
            closeAuthPanel();
        }

        if (!isAuthenticated && isAccountPanelOpen()) {
            closeAccountPanel();
        }
    });

    document.addEventListener('trivit:auth-mode-change', event => {
        syncAuthModeUi(event.detail?.mode);
    });

    document.addEventListener('trivit:request-auth-panel-open', () => {
        if (isAuthPanelOpen()) {
            return;
        }

        if (authTrigger) {
            setActive(authTrigger);
        }

        updateAuthPanelOffset();
        openAuthPanel();
    });

    document.addEventListener('trivit:request-auth-panel-close', () => {
        closeAuthPanel();
    });

    if (accountLogoutButton) {
        accountLogoutButton.addEventListener('click', () => {
            if (isLogoutPending) {
                return;
            }

            setLogoutButtonState(true);
            setAccountFeedback('Signing out...', 'pending');
            document.dispatchEvent(new CustomEvent('trivit:auth-logout-request'));
        });
    }

    document.addEventListener('trivit:auth-logout-error', event => {
        setLogoutButtonState(false);
        setAccountFeedback(event.detail?.message || 'Logout failed. Please try again.', 'error');
    });

    const initialActive = getCurrentActiveHeaderItem();
    if (initialActive) {
        updateSelector(initialActive);
    } else {
        hideSelector();
    }

    syncAuthModeUi(getCurrentAuthMode());
    syncAuthTriggerUi();
    syncPanelOverlayState();
    setLogoutButtonState(false);
    setAccountFeedback('');
    updateAuthPanelOffset();

    requestAnimationFrame(() => {
        enableSelectorAnimation();
    });

    window.addEventListener('resize', () => {
        updateAuthPanelOffset();
        const activeItem = getCurrentActiveHeaderItem();

        if (searchBar && searchBar.classList.contains('active')) {
            updateSelector(searchBar);
            return;
        }

        if (activeItem) {
            updateSelector(activeItem);
            return;
        }

        hideSelector();
    });

    window.addEventListener('popstate', () => {
        navigateTo(new URL(window.location.href), { pushStateEntry: false });
    });
});
