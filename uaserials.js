/* IMPORTS */

const service = require('movian/service');
const settings = require('movian/settings');
const page = require('movian/page');
const http = require('movian/http');
const html = require('movian/html');

/* CONSTANTS */

const DEFAULT_PAGE_TYPE = "directory";
const PLUGIN = JSON.parse(Plugin.manifest);
// plugin constants
const PLUGIN_LOGO = Plugin.path + PLUGIN.icon;
const BASE_URL = "https://uaserials.pro";
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';


/* PLUGIN CODE */

// TEXT FORMATTING -----------------------------------------------
function format(text, tag) {
    return "<font><" + tag + ">" + text + "</" + tag + "></font>";
}
function i(text) {
    return format(text, "i");
}
function b(text) {
    return format(text, "b");
}
// ---------------------------------------------------------------

function fetchDOM(href) {
    /* returns document, methods:
        - getElementById -> object
        - getElementByClassName -> array
        - getElementByTagName -> array
    */

    console.log("fetch DOM of '" + href + "'...");

    var response = http.request(href, {
        'headers': {
            'user-agent': USER_AGENT,
        },
    });

    response = response.toString();
    var dom = html.parse(response);

    return dom.root;
}

function parseMovies(page, href) {
    var dom = fetchDOM(href);

    var items = dom.getElementByClassName("short-cols");
    console.log("parseMovies items " + items)
    items.forEach(function(item) {
        var children = item.children;
        const titleUa = children[1].textContent;
        const titleEn = children[2].textContent;
        var itemTitle = titleUa;
        // itemTitle += " " + i("(" + titleEn + ")");
        const itemHref = children[0].attributes.getNamedItem('href').value;
        const itemImg = children[0].getElementByTagName("img")[0].attributes.getNamedItem('data-src').value;
        // const itemImg = BASE_URL + relativeImgPath;

        page.appendItem(PLUGIN.id + ":moviepage:" + itemHref + ":" + itemTitle, 'video', {
            title: itemTitle,
            icon: itemImg,
        });

    });
}

function setPageHeader(page, type, title) {
    page.type = type;
    if (page.metadata) {
    page.metadata.title = title;
    page.metadata.icon = PLUGIN_LOGO;
    page.metadata.logo = PLUGIN_LOGO;

    }
}


service.create(PLUGIN.title, PLUGIN.id + ':start', 'video', true, PLUGIN_LOGO);
settings.globalSettings(PLUGIN.id, PLUGIN.title, PLUGIN_LOGO, PLUGIN.synopsis);

/* PAGES */

new page.Route(PLUGIN.id + ":start", function(page) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id)
    page.loading = false;

    page.appendItem(PLUGIN.id + ':search:', 'search', {
        title: "Пошук на" + BASE_URL
    });

    var categories = [
        {name: "Серіали", tag: "/series"},
        {name: "Фільми", tag: "/films"},
        {name: "Мультсеріали", tag: "/cartoons"},
        {name: "Мультфільми", tag: "/fcartoons"},
        {name: "Аніме", tag: "/anime"},
    ];
    categories.forEach(function(data) {
        page.appendItem(PLUGIN.id + ":list:" + data.tag + ":" + data.name, "directory", {
            title: data.name
        })
    })

});
/**/
new page.Route(PLUGIN.id + ":list:(.*):(.*)", function(page, href, title) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title);
    
    page.loading = true;
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

    var dom = fetchDOM(href);

    // get details of movie (year, etc..)
    
    var detailsHTML = dom.getElementByClassName("short-list")[0].children;
    var details = [];
    detailsHTML.forEach(function(item) {
        var detail = item.textContent.replace("\n", "");    // fixme textContent is undefined here
        details.push(detail);
    });
    console.log({details: details});

    var imdbRating = dom.getElementByClassName("short-rates")[0].children[0].textContent;
    console.log({imdbRating: imdbRating});

    var img = dom.getElementByClassName("fimg")[0].children[0].attributes.getNamedItem("src").value;
    console.log({img: img});

    var description = dom.getElementByClassName("ftext")[0].textContent;
    console.log({description: description});

    // setup info on the page

    var playHref = dom.getElementByClassName("fplayer")[0].children[0].children[0]

    page.appendItem(PLUGIN.id + ":play:" + href + ":" + title, 'video', {
        title: itemTitle,
        icon: itemImg,
    });

    page.loading = false;

});

new page.Route(PLUGIN.id + ':play:(.*):(.*)', function(page, href, title) {
    setPageHeader(page, "video", PLUGIN.id + " - " + title)

    // todo

    page.redirect(href);
});

function setupSearchPage(page, query) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id)

    page.loading = true;

    var searchUrl = BASE_URL + "/index.php?do=search&story=" + query
    var nextPageNumber = 1;

    function loader() {
        page.loading = true;
        var url = searchUrl + "&search_start=" + nextPageNumber;

        console.log("search at '" + url + "'...");

        parseMovies(page, url);
        nextPageNumber++;

        // todo: check if next page exists
        page.loading = false;
    }

    page.asyncPaginator = loader;
    loader();

    page.loading = false;
};

new page.Route(PLUGIN.id + ":search:(.*)", function(page, query) {
    setupSearchPage(page, query);
})

new page.Searcher(PLUGIN.id, PLUGIN_LOGO, function(page, query) {
    setupSearchPage(page, query);
});