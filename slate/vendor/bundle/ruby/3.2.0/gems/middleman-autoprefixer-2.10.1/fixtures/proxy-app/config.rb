activate :autoprefixer, inline: true

proxy '/proxy', '/stylesheets/page.css', ignore: true
proxy '/proxy-inline', '/index.html', ignore: true
