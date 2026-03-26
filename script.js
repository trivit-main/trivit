document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const selector = document.querySelector('.tab-selector');
    const items = Array.from(document.querySelectorAll('header .tab'));
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar ? searchBar.querySelector('input') : null;
    let navigationToken = 0;

    function getSearchTargetWidth() {
        return window.innerWidth <= 820 ? Math.min(286, window.innerWidth * 0.7) : 286;
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
            setActive(searchBar);
        });

        searchInput.addEventListener('focus', () => {
            setActive(searchBar);
        });
    }

    const initialActive = getCurrentActiveHeaderItem();
    if (initialActive) {
        updateSelector(initialActive);
    } else {
        hideSelector();
    }

    requestAnimationFrame(() => {
        enableSelectorAnimation();
    });

    window.addEventListener('resize', () => {
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
