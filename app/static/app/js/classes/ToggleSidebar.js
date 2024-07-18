class Sidebar {
    constructor() {
        const background = document.querySelector("[data-sidebar='background']");
        const pageWrapper = document.querySelector("#page-wrapper");
        const nav = document.querySelector("[data-sidebar='nav']");
        const toggle = document.querySelector("[data-sidebar='toggle']");
        const menu_items = document.querySelector("[data-sidebar='menu_items']");
        const links = document.querySelectorAll("[data-sidebar='link-text']");
        const icons = document.querySelectorAll("[data-sidebar='icons']");
        const toggleButton = document.querySelector(".toggle-button");

        if (!background || !nav || !toggle || !links.length) return;

    
        this.background = background;
        this.nav = nav;
        this.menu_items = menu_items;
        this.links = links;
        this.icons = icons;
        this.isExpanded = true;
        this.pageWrapper = pageWrapper;
        this.toggleButton = toggleButton;

        toggle.addEventListener("click", () => this.handleToggleClick());
        this.toggleButton.classList.add('toggle-btn-expanded');
    }

    addCollapsedClass() {
        this.toggleButton.classList.remove('toggle-btn-expanded');
        this.toggleButton.classList.add('toggle-btn-collapsed');
        this.background.classList.add('collapsed');
        this.menu_items.classList.add('collapsed');
        this.pageWrapper.classList.add('collapsed-margin');
    }

    addExpandedClass() {
        this.background.classList.remove('collapsed');
        this.menu_items.classList.remove('collapsed');
        this.pageWrapper.classList.remove('collapsed-margin');
        this.toggleButton.classList.remove('toggle-btn-collapsed');
        this.toggleButton.classList.add('toggle-btn-expanded');
    }

    hideLinks() {
        for (const link of this.links) {
            link.classList.add('collapsed');
            link.parentElement.classList.add("collapsed");
            link.parentElement.style.borderRadius = 0;
        }

        for (const icon of this.icons) {
            icon.style.fontSize = "2rem";
        }
    } 

    showLinks() {
        for (const link of this.links) {
            link.classList.remove('collapsed');
            link.parentElement.classList.remove("collapsed");
        }

        for (const icon of this.icons) {
            icon.style.fontSize = "1.5rem";
        }
    } 

    shrink() {
        this.addCollapsedClass();
        this.hideLinks();
        this.isExpanded = false;
    }

    expand() {
        this.addExpandedClass();
        this.showLinks();
        this.isExpanded = true;
    }

    handleToggleClick() {
        if (this.isExpanded) {
            this.shrink();
            return;
        }
        this.expand();
    }
}

// window.addEventListener("load", () => new Sidebar());