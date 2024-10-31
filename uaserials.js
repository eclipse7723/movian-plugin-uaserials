/* IMPORTS */

const service = require('movian/service');
const settings = require('movian/settings');
const page = require('movian/page');
const html = require('movian/html');

/* CONSTANTS */

const DEFAULT_PAGE_TYPE = "directory";
const DEFAULT_DEBUG = false;
const PLUGIN = JSON.parse(Plugin.manifest);
// plugin constants
const PLUGIN_LOGO = Plugin.path + PLUGIN.icon;
const BASE_URL = "https://uaserials.com";

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
settings.createBool("debug", "Enable DEBUG", DEFAULT_DEBUG, function (v) {service._debug = v})
settings._debug = DEFAULT_DEBUG;


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
        page.appendItem(PLUGIN.id + ":pre-list:" + data.tag + ":" + data.name, "directory", {
            title: data.name
        })
    })

    page.appendItem(PLUGIN.id + ":collections", "directory", {
        title: "Добірки фільмів, серіалів і мультфільмів"
    })

});

new page.Route(PLUGIN.id + ":pre-list:(.*):(.*)", function(page, tag, title) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title);

    try {
        parseListFilters(page, tag);
    } catch (e) {
        console.log("Error while parsing list filters: " + e);
        page.redirect(PLUGIN.id + ":list:" + tag + ":" + title + ":" + "all");
    }
});

new page.Route(PLUGIN.id + ":list:(.*):(.*):(.*)", function(page, tag, title, filterQuery) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title);

    const query = filterQuery === "all" ? "" : "/f/" + filterQuery;

    function generateSearchURL(nextPage) {
        return BASE_URL + tag + query + "/page/" + nextPage + "/"
    }

    var loader = createPageLoader(page, generateSearchURL, 1);
    loader();

    page.paginator = loader;
});

new page.Route(PLUGIN.id + ":collections", function(page) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + "Добірки");
    var href = BASE_URL + "/collections"
    
    parseCollections(page, href);
});

new page.Route(PLUGIN.id + ":collection:(.*):(.*)", function(page, href, title) {
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
    var details = {};
    for (var i = 0; i < detailsHTML.length; i++) {
        const item = detailsHTML[i];
        if (!item.textContent) { continue; }
        const match = item.textContent.match(/([^:]+):(.+)/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            details[key] = value;
        }
    }
    console.log(details)

    var imdbRating = doc.getElementByClassName("short-rates")[0].getElementByTagName("a");
    if (imdbRating.length !== 0) {
        imdbRating = imdbRating[0].textContent;
    } else {
        imdbRating = undefined  // todo: try to fetch from IMDB api actual rating
    }

    var img = doc.getElementByClassName("fimg")[0].children[0].attributes.getNamedItem("src").value;

    var description = doc.getElementByClassName("ftext")[0].textContent;

    /* setup info on the page */

    var infoData = {
        title: title,
        icon: img,
        description: description,
    }
    if (imdbRating) {
        infoData.rating = imdbRating * 10;
    }
    if (details.hasOwnProperty("Рік")) {
        infoData.year = parseInt(details["Рік"]);
    }
    if (details.hasOwnProperty("Жанр")) {
        infoData.genre = new RichText(formatInfo(details["Жанр"]));
    }
    page.appendPassiveItem('video', '', infoData);

    currentMovieData = UASJsonDecrypt(htmlText);
    currentMovieData["title"] = title;
    currentMovieData["href"] = href;
    currentMovieData["img"] = img;
    currentMovieData["description"] = description;
    currentMovieData["rating"] = infoData.rating;
    currentMovieData["year"] = infoData.year;
    currentMovieData["genre"] = infoData.genre;

    // logDebug({currentMovieData:currentMovieData})

    parseTrailer(page, currentMovieData);

    page.appendPassiveItem("separator", '', {
        title: "Дивитись онлайн (HLS)"
    });

    parseMovie(page, currentMovieData);

    page.loading = false;

});

new page.Route(PLUGIN.id + ':play:(.*)', function(page, data) {
    data = JSON.parse(data);

    setPageHeader(page, "video", PLUGIN.id + " - " + data.title)
    
    page.type = 'video';
    page.source = 'videoparams:' + JSON.stringify({
      title: data.title + (data.season ? ": " + data.season + " " + data.episode : ""),
      sources: [{
        url: "hls:" + parseVideoURL(data.href),
      }],
      year: data.year ? data.year : 0,
      // season: data.season ? data.season : -1,
      // episode: data.episode ? data.episode : -1,
      no_subtitle_scan: false,  // Don't scan for subtitles at all
      no_fs_scan: false,  // Don't scan FS for subtitles
    });

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