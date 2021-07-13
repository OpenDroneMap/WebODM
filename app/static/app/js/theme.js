(function ($) {
  // Activate scrollspy to add active class to navbar items on scroll
  $("body").scrollspy({
    target: "#mainNav",
    offset: 54,
  });

  // Transparent navbar
  function navbarTopDetect () {
    if ($("#mainNav").offset().top > 72) {
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
              img: "/static/app/img/landing/flag-th.png",
            }
          : {
              img: "/static/app/img/landing/flag-eng.png",
            };
      },
    },
  });

  var footerApp = new Vue({
    i18n,
    el: "#app-landing-footer"
  })
})(jQuery); // End of use strict
