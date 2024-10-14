class Sidebar {
    constructor() {
        const pageWrapper = document.querySelector("#page-wrapper");
        const toggle = document.querySelector("[data-sidebar='toggle']");
        const menu_items = document.querySelector("[data-sidebar='menu_items']");
        const toggleButton = document.querySelector(".toggle-button");
        const itens_collapse = document.querySelectorAll(".itens-collapse");

        this.menu_items = menu_items;
        this.pageWrapper = pageWrapper;
        this.toggleButton = toggleButton;

        toggle.addEventListener("click", () => this.handleToggleClick());
        itens_collapse.forEach(item => {
            item.addEventListener("click", () => this.handleItemCollapse());
        });
    }

    handleToggleClick() {
        this.menu_items.classList.toggle("collapsed-side");

        if (this.menu_items.classList.contains("collapsed-side")) {
            this.pageWrapper.classList.add("collapsed-side-margin");
        } else {
            this.pageWrapper.classList.remove("collapsed-side-margin");
        }

        
        const event = new CustomEvent("sidebarToggle", {
            detail: { collapsed: this.menu_items.classList.contains("collapsed-side") }
        });
        window.dispatchEvent(event);
    }

    handleItemCollapse() {
        if (this.menu_items.classList.contains("collapsed-side")) {
            this.menu_items.classList.remove("collapsed-side");
            this.pageWrapper.classList.remove("collapsed-side-margin");

            
            const event = new CustomEvent("sidebarToggle", {
                detail: { collapsed: false }
            });
            window.dispatchEvent(event);
        }
    }
}

window.addEventListener("load", () => new Sidebar());
