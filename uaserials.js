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

/* SETTINGS */
settings.globalSettings(PLUGIN.id, PLUGIN.title, PLUGIN_LOGO, PLUGIN.synopsis);
settings.createBool("debug", "Enable DEBUG", false, function (v) {service._debug = v})

function logDebug(message) {
    if (service._debug) {
        console.log(message)
    }
}

// todo: add quality select if possible

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

    function generateSearchURL(nextPage) {
        return BASE_URL + href + "/page/" + nextPage + "/"
    }

    var loader = createPageLoader(page, generateSearchURL, 1);
    loader();

    page.paginator = loader;
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
        details.push(detail);
    }

    var imdbRating = doc.getElementByClassName("short-rates")[0].getElementByTagName("a");
    if (imdbRating.length !== 0) {
        imdbRating = imdbRating[0].textContent;
    } else {
        imdbRating = undefined  // todo: try to fetch from IMDB api actual rating
    }

    var img = doc.getElementByClassName("fimg")[0].children[0].attributes.getNamedItem("src").value;

    var description = doc.getElementByClassName("ftext")[0].textContent;

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
    // logDebug({currentMovieData:currentMovieData})

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

    var searchUrl = BASE_URL + "/index.php?do=search&story=" + query
    function generateSearchURL(nextPageNumber) {
        return searchUrl + "&search_start=" + nextPageNumber;
    }
    
    var loader = createPageLoader(page, generateSearchURL, 1);
    loader();

    page.paginator = loader;
}

new page.Route(PLUGIN.id + ":search:(.*)", function(page, query) {
    setupSearchPage(page, query);
});

new page.Searcher(PLUGIN.id, PLUGIN_LOGO, function(page, query) {
    setupSearchPage(page, query);
});