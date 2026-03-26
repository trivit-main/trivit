document.addEventListener('DOMContentLoaded', function() {

    const header = document.querySelector('header');
    const items = Array.from(document.querySelectorAll('header .tab'));
    const selector = document.querySelector('.tab-selector');
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar ? searchBar.querySelector('input') : null;

    function getSearchTargetWidth() {
        return window.innerWidth <= 820 ? Math.min(286, window.innerWidth * 0.7) : 286;
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
            return;
        }

        const activeRect = activeEl.getBoundingClientRect();
        const left = activeRect.left - headerRect.left;
        selector.style.transform = `translateX(${left}px)`;
        selector.style.width = `${activeRect.width}px`;
    }

    function setActive(activeEl) {
        items.forEach(item => {
            if (item !== activeEl) {
                item.classList.remove('active');
            }
        });

        activeEl.classList.add('active');

        if (activeEl === searchBar) {
            updateSelector(activeEl);
            return;
        }

        if (searchBar) {
            searchBar.classList.remove('active');
        }

        updateSelector(activeEl);
    }

    items.forEach(el => {
        el.addEventListener('click', function() {
            setActive(this);
        });
    });

    // Hover outline element
    const hoverEl = document.querySelector('.tab-hover');

    function showHover(target) {
        if (!hoverEl || !target) return;
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

    items.forEach(el => {
        el.addEventListener('mouseenter', function() {
            showHover(this);
        });
        el.addEventListener('mouseleave', function() {
            // hide after small delay to allow moving between items
            setTimeout(() => {
                // if mouse is not over any item, hide
                if (!document.querySelector(':hover') || !Array.from(items).some(i => i.matches(':hover'))) {
                    hideHover();
                }
            }, 50);
        });
    });

    // hide hover when leaving header entirely
    header.addEventListener('mouseleave', hideHover);

    const initialActive = document.querySelector('header .tab.active');
    if (initialActive && selector) {
        requestAnimationFrame(() => {
            selector.style.width = `${initialActive.getBoundingClientRect().width}px`;
            updateSelector(initialActive);
        });
    }

    if (searchInput) {
        searchBar.addEventListener('pointerdown', () => {
            setActive(searchBar);
        });

        searchInput.addEventListener('focus', () => {
            setActive(searchBar);
        });

    }

    window.addEventListener('resize', () => {
        const active = document.querySelector('header .tab.active');
        if (active) updateSelector(active);
    });
});
