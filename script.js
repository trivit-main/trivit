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

        if (!document.querySelector('.auth-overlay') || !document.querySelector('.auth-panel')) {
            header.insertAdjacentHTML('afterend', `
                <div class="auth-overlay" aria-hidden="true"></div>
                <section class="auth-panel" id="auth-panel" aria-hidden="true" aria-labelledby="auth-title" role="dialog" aria-modal="true">
                    <button class="auth-close" type="button" aria-label="Close access panel">X</button>
                    <h2 id="auth-title">Accedi a Trivit</h2>
                    <p class="auth-copy">Usa email e password per entrare o creare il tuo account.</p>
                    <form class="auth-form" id="auth-login-form" data-auth-mode="login">
                        <label class="auth-field" for="auth-email">
                            <span>Email</span>
                            <input id="auth-email" name="email" type="email" autocomplete="email" required>
                        </label>
                        <label class="auth-field" for="auth-password">
                            <span>Password</span>
                            <input id="auth-password" name="password" type="password" autocomplete="current-password" required>
                        </label>
                        <button class="auth-submit" type="submit">LOG IN</button>
                        <p class="auth-feedback" role="status" aria-live="polite"></p>
                        <div class="auth-mode-switch">
                            <span class="auth-mode-label">Non hai un account?</span>
                            <button class="auth-mode-toggle" type="button">Registrati</button>
                        </div>
                    </form>
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
    const authOverlay = document.querySelector('.auth-overlay');
    const authClose = document.querySelector('.auth-close');
    const authForm = document.querySelector('#auth-login-form');
    const authTitle = document.querySelector('#auth-title');
    const authCopy = document.querySelector('.auth-copy');
    const authSubmit = document.querySelector('.auth-submit');
    const authModeLabel = document.querySelector('.auth-mode-label');
    const authModeToggle = document.querySelector('.auth-mode-toggle');
    let navigationToken = 0;
    let lastHeaderSelection = document.querySelector('header .tab.active') || null;

    const authModeConfig = {
        login: {
            title: 'Accedi a Trivit',
            copy: 'Usa email e password per entrare nel tuo account.',
            submit: 'LOG IN',
            switchLabel: 'Non hai un account?',
            switchAction: 'Registrati'
        },
        register: {
            title: 'Registrati a Trivit',
            copy: 'Crea il tuo account usando email e password.',
            submit: 'REGISTRATI',
            switchLabel: 'Hai gia un account?',
            switchAction: 'Accedi'
        }
    };

    function getSearchTargetWidth() {
        return window.innerWidth <= 820 ? Math.min(286, window.innerWidth * 0.7) : 286;
    }

    function getCurrentAuthMode() {
        return authForm?.dataset.authMode === 'register' ? 'register' : 'login';
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

    function updateSelector(activeEl) {
        if (!activeEl || !selector || !header) return;

        const headerRect = header.getBoundingClientRect();

        if (activeEl === searchBar && searchInput) {
            const activeRect = activeEl.getBoundingClientRect();
            const targetWidth = getSearchTargetWidth();
            const left = activeRect.right - headerRect.left - targetWidth;
            selector.style.transform = `translateX(${left}px)`;
            selector.style.width = `${targetWidth}px`;
            showSelector();
            return;
        }

        const activeRect = activeEl.getBoundingClientRect();
        const left = activeRect.left - headerRect.left;
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
        if (!authPanel || !authOverlay || !authTrigger) return;

        authPanel.classList.add('is-open');
        authPanel.setAttribute('aria-hidden', 'false');
        authOverlay.classList.add('is-open');
        authOverlay.setAttribute('aria-hidden', 'false');
        authTrigger.setAttribute('aria-expanded', 'true');
        document.body.classList.add('auth-open');
        syncAuthModeUi('login');
        document.dispatchEvent(new CustomEvent('trivit:auth-panel-open'));
    }

    function closeAuthPanel(options = {}) {
        const { restoreSelection = true } = options;

        if (!authPanel || !authOverlay || !authTrigger) return;

        authPanel.classList.remove('is-open');
        authPanel.setAttribute('aria-hidden', 'true');
        authOverlay.classList.remove('is-open');
        authOverlay.setAttribute('aria-hidden', 'true');
        authTrigger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('auth-open');
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
        const left = rect.left - headerRect.left;
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
        const link = event.target.closest('header a[href], footer a[href]');
        if (!shouldHandleLink(link, event)) return;

        const url = new URL(link.href, window.location.href);
        const currentUrl = new URL(window.location.href);
        const clickedTab = link.closest('header .tab');

        if (clickedTab) {
            setActive(clickedTab);
        }

        if (authPanel && authPanel.classList.contains('is-open')) {
            closeAuthPanel({ restoreSelection: false });
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
            closeAuthPanel({ restoreSelection: false });
            setActive(searchBar);
        });

        searchInput.addEventListener('focus', () => {
            closeAuthPanel({ restoreSelection: false });
            setActive(searchBar);
        });
    }

    if (authTrigger) {
        authTrigger.addEventListener('click', () => {
            const isOpen = authPanel?.classList.contains('is-open');

            if (isOpen) {
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

    if (authOverlay) {
        authOverlay.addEventListener('click', () => {
            closeAuthPanel();
        });
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && authPanel?.classList.contains('is-open')) {
            closeAuthPanel();
        }
    });

    document.addEventListener('trivit:auth-login-success', () => {
        closeAuthPanel();
    });

    document.addEventListener('trivit:auth-mode-change', event => {
        syncAuthModeUi(event.detail?.mode);
    });

    document.addEventListener('trivit:request-auth-panel-open', () => {
        if (authPanel?.classList.contains('is-open')) {
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

    const initialActive = getCurrentActiveHeaderItem();
    if (initialActive) {
        updateSelector(initialActive);
    } else {
        hideSelector();
    }

    syncAuthModeUi(getCurrentAuthMode());
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
