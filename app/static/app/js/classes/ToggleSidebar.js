class Sidebar {
    constructor() {
        
        const pageWrapper = document.querySelector("#page-wrapper");
        const toggle = document.querySelector("[data-sidebar='toggle']");
        const menu_items = document.querySelector("[data-sidebar='menu_items']");
        const toggleButton = document.querySelector(".toggle-button");



        this.menu_items = menu_items;
        this.pageWrapper = pageWrapper;
        this.toggleButton = toggleButton;

        toggle.addEventListener("click", () => this.handleToggleClick());
    }



    handleToggleClick() {

        this.menu_items.classList.toggle("collapsed-side");

        if (this.menu_items.classList.contains("collapsed-side")) {
            this.pageWrapper.classList.add("collapsed-side-margin");
        } else {
            this.pageWrapper.classList.remove("collapsed-side-margin");
        }

    }
}

window.addEventListener("load", () => {
    new Sidebar();
});

