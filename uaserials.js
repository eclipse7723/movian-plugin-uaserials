/* IMPORTS */

const service = require('movian/service');
const settings = require('movian/settings');
const page = require('movian/page');
const html = require('movian/html');

/* CONSTANTS */

const DEFAULT_PAGE_TYPE = "directory";
const PLUGIN = JSON.parse(Plugin.manifest);
// plugin constants
const PLUGIN_LOGO = Plugin.path + PLUGIN.icon;
const BASE_URL = "https://uaserials.pro";

/* PLUGIN CODE */

function setPageHeader(page, type, title) {
    page.type = type;
    if (page.metadata) {
        page.metadata.title = title;
        page.metadata.icon = PLUGIN_LOGO;
        page.metadata.logo = PLUGIN_LOGO;
    }
}

var currentMovieData;
service.create(PLUGIN.title, PLUGIN.id + ':start', 'video', true, PLUGIN_LOGO);
settings.globalSettings(PLUGIN.id, PLUGIN.title, PLUGIN_LOGO, PLUGIN.synopsis);

// todo: add DEBUG setting
// todo: add quality select if possible
// todo: add button "next page"

/* PAGES */

new page.Route(PLUGIN.id + ":start", function(page) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id)
    page.loading = false;

    page.appendItem(PLUGIN.id + ':search:', 'search', {
        title: "Пошук на " + BASE_URL
    });

    var categories = [
        {name: "Серіали", tag: "/series"},
        {name: "Фільми", tag: "/films"},
        {name: "Мультсеріали", tag: "/cartoons"},
        {name: "Мультфільми", tag: "/fcartoon"},
        {name: "Аніме", tag: "/anime"},
    ];
    categories.forEach(function(data) {
        page.appendItem(PLUGIN.id + ":list:" + data.tag + ":" + data.name, "directory", {
            title: data.name
        })
    })

});

new page.Route(PLUGIN.id + ":list:(.*):(.*)", function(page, href, title) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title);
    
    page.loading = true;
    page.entries = 0
    parseMovies(page, BASE_URL + href)

    // pagination --------------------
    function generateSearchURL(nextPage) {
        return BASE_URL + href + "/page/" + nextPage + "/"
    }
    var nextPageNumber = 2;

    function loader() {
        var url = generateSearchURL(nextPageNumber);

        parseMovies(page, url);
        nextPageNumber++;

        // todo: check if next page exists
    }

    page.asyncPaginator = loader;   // fixme: loading not working ?
    // -------------------------------

    page.loading = false;
});

new page.Route(PLUGIN.id + ":moviepage:(.*):(.*)", function(page, href, title) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title)

    page.loading = true;

    const htmlText = fetchHTML(href);
    const doc = html.parse(htmlText).root;

    // get details of movie (year, etc..)
    
    var detailsHTML = doc.getElementByClassName("short-list")[0].children;
    var details = [];
    for (var i = 0; i < detailsHTML.length; i++) {
        const item = detailsHTML[i];
        const detail = item.textContent;
        // console.log("   > ", detail);
        details.push(detail);
    }
    // console.log({details: details});

    var imdbRating = doc.getElementByClassName("short-rates")[0].getElementByTagName("a");
    if (imdbRating.length !== 0) {
        imdbRating = imdbRating[0].textContent;
    } else {
        imdbRating = undefined  // todo: try to fetch from IMDB api actual rating
    }
    // console.log({imdbRating: imdbRating});

    var img = doc.getElementByClassName("fimg")[0].children[0].attributes.getNamedItem("src").value;
    // console.log({img: img});

    var description = doc.getElementByClassName("ftext")[0].textContent;
    // console.log({description: description});

    /* setup info on the page */

    page.appendPassiveItem('video', '', {
        title: title,
        icon: img,
        description: description,
        rating: imdbRating ? imdbRating * 10 : 0,
    });

    currentMovieData = UASJsonDecrypt(htmlText);
    currentMovieData["title"] = title;
    currentMovieData["href"] = href;
    currentMovieData["img"] = href;
    // console.log({currentMovieData:currentMovieData})

    parseTrailer(page, currentMovieData);

    page.appendPassiveItem("separator", '', {
        title: "Дивитись онлайн (HLS)"
    });

    parseMovie(page, currentMovieData);

    page.loading = false;

});

new page.Route(PLUGIN.id + ':play:(.*):(.*)', function(page, href, title) {
    setPageHeader(page, "video", PLUGIN.id + " - " + title)
    
    const videoURL = parseVideoURL(href);
    page.source = videoURL;

    page.loading = false;
});

new page.Route(PLUGIN.id + ':play-select-sound:(.*):(.*):(.*)', function(page, title, season, episode) {
    setPageHeader(page, "directory", PLUGIN.id + " - " + title + " - озвучка")

    parseTvEpisode(page, currentMovieData, season, episode);
    page.loading = false;
});

function setupSearchPage(page, query) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id)

    page.loading = true;

    var searchUrl = BASE_URL + "/index.php?do=search&story=" + query
    var nextPageNumber = 1;

    function loader() {
        page.loading = true;
        var url = searchUrl + "&search_start=" + nextPageNumber;

        // console.log("search at '" + url + "'...");

        parseMovies(page, url);
        nextPageNumber++;

        // todo: check if next page exists
        page.loading = false;
    }

    page.asyncPaginator = loader;
    loader();

    page.loading = false;
}

new page.Route(PLUGIN.id + ":search:(.*)", function(page, query) {
    setupSearchPage(page, query);
});

new page.Searcher(PLUGIN.id, PLUGIN_LOGO, function(page, query) {
    setupSearchPage(page, query);
});