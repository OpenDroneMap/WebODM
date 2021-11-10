import $ from 'jquery';

function setLocale(locale){
    var fd = new FormData();
    fd.append('language', locale);

    $.ajax({
      url: `/i18n/setlang/`,
      contentType: false,
      processData: false,
      data: fd,
      type: 'POST'
    }).done(function(){
        location.reload(true);
    }).fail(function(e){
        console.error("Cannot set locale", e);
    });
}

export { setLocale };