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

var currentMovieData; // contains current movie data cache
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
// todo: add auto-update since new movian version can load and unzip the plugin

/* PAGES */

new page.Route(PLUGIN.id + ":start", function(page) {
    /* главная страница плагина */
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
        //{name: "Ексклюзиви", tag: "/exclusive"},
    ];
    categories.forEach(function(data) {
        page.appendItem(PLUGIN.id + ":list-select:" + data.tag + ":" + data.name, "directory", {
            title: data.name + " ▶"
        })
    })

    page.appendItem(PLUGIN.id + ":collections", "directory", {
        title: "Добірки фільмів, серіалів і мультфільмів" + " ▶"
    })

});

new page.Route(PLUGIN.id + ":list-select:(.*):(.*)", function(page, tag, title) {
    /* страница с выбором - все фильмы или фильтровать */

    const noFiltersCategories = ["Аніме"];
    // probably this filter is useless for this category of movies
    const noGenresCategories = ["Мультсеріали", "Мультфільми"];

    if (noFiltersCategories.indexOf(title) !== -1) {
        page.redirect(PLUGIN.id + ":list:" + tag + ":" + title + ":all");
        return;
    }

    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title);

    /* all movies */

    page.appendItem(PLUGIN.id + ":list:" + tag + ":" + title + ":all", "directory", {
        title: "Усі " + title.toLowerCase() + " ▶"
    });

    /* new movies */

    page.appendItem(PLUGIN.id + ":list-main:" + tag + ":" + title, "directory", {
        title: "Новинки на сайті ▶"
    });

    /* детальные фильтры */

    page.appendPassiveItem("separator", "", {
        title: "Фільтри"
    });

    function putFilteredButton(searchBy, filterKey) {
        page.appendItem(PLUGIN.id + ":list-filtered:" + tag + ":" + title + ":" + filterKey, "directory", {
            title: "Обрати за " + searchBy + " ▶"
        });
    }

    if (noGenresCategories.indexOf(title) === -1) {
        putFilteredButton("жанром", "cat");
    }
    putFilteredButton("роком прем'єри", "year");
    putFilteredButton("рейтингом IMDb", "imdb");
    putFilteredButton("країною", "country");
    putFilteredButton("телеканалом", "channel");

});

new page.Route(PLUGIN.id + ":list-filtered:(.*):(.*):(.*)", function(page, tag, title, filters) {
    /* страница с фильтрами */
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title);

    try {
        parseListFilters(page, tag, title, filters);
    } catch (e) {
        console.log("Error while parsing list filters: " + e);
        page.redirect(PLUGIN.id + ":list:" + tag + ":" + title + ":all");
    }
});

new page.Route(PLUGIN.id + ":list-main:(.*):(.*)", function(page, tag, title) { // todo
    /* страница с фильтрами с главной страницы сайта по тегу */
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title + " - Новинки на сайті");

    try {
        parseListFromMain(page, tag, title);
    } catch (e) {
        console.log("Error while parsing list from main page: " + e);
        page.redirect(PLUGIN.id + ":list:" + tag + ":" + title + ":all");
    }
});

new page.Route(PLUGIN.id + ":list:(.*):(.*):(.*)", function(page, tag, title, filterQuery) {
    /* страница со списком фильмов согласно прописанным фильтрам (all для отображения всех) */
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
    /* страница с подборками */
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + "Добірки");
    var href = BASE_URL + "/collections"
    
    parseCollections(page, href);
});

new page.Route(PLUGIN.id + ":collection:(.*):(.*)", function(page, href, title) {
    /* страница с фильмами из подборки */
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title);
    
    function generateSearchURL(nextPage) {
        return BASE_URL + href + "/page/" + nextPage + "/"
    }

    var loader = createPageLoader(page, generateSearchURL, 1);
    loader();

    page.paginator = loader;
});

new page.Route(PLUGIN.id + ":moviepage:(.*):(.*)", function(page, href, title) {
    /* страница с деталями фильма и перехода к просмотру */
    setPageHeader(page, DEFAULT_PAGE_TYPE, title)

    // todo: add logo of film so user can make bookmark and view actual logo of movie in main page of movian

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

    // todo: add details page so user can do search by year, genre, etc..

    page.appendPassiveItem("separator", '', {
        title: "Дивитись онлайн (HLS)"
    });

    parseMovie(page, currentMovieData);

    page.loading = false;

});

new page.Route(PLUGIN.id + ':play:(.*)', function(page, data) {
    /* страница с плеером */
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
    /* страница с выбором озвучки */
    setPageHeader(page, "directory", PLUGIN.id + " - " + title + " - озвучка")

    parseTvEpisode(page, currentMovieData, season, episode);

    // todo: add regirect to play page if only one sound is available

    page.loading = false;
});

function setupSearchPage(page, query) {
    /* поисковая страница */
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
    /* страница с поиском внутри плагина */
    setupSearchPage(page, query);
});

new page.Searcher(PLUGIN.id, PLUGIN_LOGO, function(page, query) {
    /* Searcher позволяет из мовиана использовать поиск в этом плагине */
    setupSearchPage(page, query);
});