(function ($) {
  // Activate scrollspy to add active class to navbar items on scroll
  $("body").scrollspy({
    target: "#mainNav",
    offset: 54,
  });

  // Transparent navbar
  var navbarTopDetect = function () {
    if ($("#mainNav").offset().top > 100) {
      $("#mainNav").removeClass("navbar-top");
    } else {
      $("#mainNav").addClass("navbar-top");
    }
  };
  navbarTopDetect();
  $(window).scroll(navbarTopDetect);

  var navbarApp = new Vue({
    el: "#mainNav",
    i18n,
    data: {},
    methods: {
      selectLang: function (lang) {
        this.$i18n.locale = lang;
        localStorage.setItem("lang", lang);
      },
    },
    computed: {
      // a computed getter
      currentLang: function () {
        // `this` points to the vm instance
        return this.$i18n.locale === "th"
          ? {
              img: "src/assets/images/flag-th.png",
            }
          : {
              img: "src/assets/images/flag-eng.png",
            };
      },
    },
  });

  var footerApp = new Vue({
    i18n,
    el: "#app-landing-footer"
  })
})(jQuery); // End of use strict
