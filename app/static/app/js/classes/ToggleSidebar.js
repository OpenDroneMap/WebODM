class Sidebar {
    constructor() {
        const background = document.querySelector("[data-sidebar='background']")
        const nav = document.querySelector("[data-sidebar='nav']")
        const toggle = document.querySelector("[data-sidebar='toggle']")
        const menu_items = document.querySelector("[data-sidebar='menu_items']")
        const links = document.querySelectorAll("[data-sidebar='link-text']")
        const icons = document.querySelectorAll("[data-sidebar='icons']")

        if (!background || !nav || !toggle || !links.length) return

    
        this.background = background
        this.nav = nav
        this.menu_items = menu_items
        this.links = links
        this.icons = icons
        this.isExpanded = true


        toggle.addEventListener("click", () => this.handleToggleClick())
    }

    hideLinks() {
        for (const link of this.links) {
            link.style.display = "none"
            link.parentElement.style.borderRadius = 0
        }

        for (const icon of this.icons) {
            icon.style.fontSize = "2rem"
        }
    } 

    showLinks() {
        for (const link of this.links) {
            link.style.display = "inline"

        }

        for (const icon of this.icons) {
            icon.style.fontSize = "1.5rem"
        }
    } 

    shrink() {
        this.background.style.width = "60px"
        this.menu_items.style.width = "60px"
        this.hideLinks()
        this.isExpanded = false
    }

    expand() {
        this.background.style.width = "452px"
        this.menu_items.style.width = "452px"
        this.showLinks()
        this.isExpanded = true
    }

    handleToggleClick() {
        if (this.isExpanded) {
            this.shrink()
            return
        }
        this.expand()
    }
}

window.addEventListener("load", () => new Sidebar())