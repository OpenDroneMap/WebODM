(function($) {
    
    // Activate scrollspy to add active class to navbar items on scroll
    $('body').scrollspy({
        target: '#mainNav',
        offset: 54
    });

    // Transparent navbar
    var navbarTopDetect = function() {
        if ($("#mainNav").offset().top > 100) {
            $("#mainNav").removeClass("navbar-top");
        } else {
            $("#mainNav").addClass("navbar-top");
        }
    };
    navbarTopDetect();
    $(window).scroll(navbarTopDetect);

})(jQuery); // End of use strict