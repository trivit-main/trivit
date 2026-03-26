document.addEventListener('DOMContentLoaded', function() {

    const header = document.querySelector('header');
    // select all .tab elements across the header (left and right)
    const items = Array.from(document.querySelectorAll('header .tab'));
    const selector = document.querySelector('.tab-selector');

    function updateSelector(activeEl) {
        const activeRect = activeEl.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const left = activeRect.left - headerRect.left;
        selector.style.transform = `translateX(${left}px)`;
        selector.style.width = `${activeRect.width}px`;
    }

    items.forEach(el => {
        el.addEventListener('click', function() {
            // remove active from all
            items.forEach(i => i.classList.remove('active'));
            // add to clicked
            this.classList.add('active');
            updateSelector(this);
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

    // Initialize selector position on the currently active element
    const initialActive = document.querySelector('header .tab.active');
    if (initialActive && selector) {
        // set initial size/position
        // position after a tick to ensure styles/layout applied
        requestAnimationFrame(() => {
            selector.style.width = `${initialActive.getBoundingClientRect().width}px`;
            updateSelector(initialActive);
        });
    }

    // Make the search input behave like a selectable tab when focused
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar ? searchBar.querySelector('input') : null;
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            items.forEach(i => i.classList.remove('active'));
            searchBar.classList.add('active');
            updateSelector(searchBar);
        });
        searchInput.addEventListener('blur', () => {
            // If another tab is active, restore selector to it.
            const otherActive = document.querySelector('header .tab.active');
            if (otherActive && otherActive !== searchBar) updateSelector(otherActive);
        });
    }

    // Recalculate on resize to keep selector aligned
    window.addEventListener('resize', () => {
        const active = document.querySelector('header .tab.active');
        if (active) updateSelector(active);
    });
});