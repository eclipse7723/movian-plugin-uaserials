/* IMPORTS */

const service = require('movian/service');
const settings = require('movian/settings');
const page = require('movian/page');
const http = require('movian/http');

/* CONSTANTS */

const DEFAULT_PAGE_TYPE = "directory";
const PLUGIN = JSON.parse(Plugin.manifest);
// plugin constants
const PLUGIN_LOGO = Plugin.path + PLUGIN.icon;
const BASE_URL = "https://uaserials.pro";
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';


/* PLUGIN CODE */

function fetchDOM(href) {
    console.log("fetch DOM of '" + href + "'...");

    var response = http.request(href, {
        'headers': {
            'user-agent': USER_AGENT,
        },
    });
    response = response.toString();
    var dom = html.parse(response);

    return dom;
}

function parseMovies(page, href) {
    var dom = fetchDOM(href);

    var items = dom.root.getElementsByClassName("short-cols");
    items.forEach(function(item) {
        var children = item.children;
        var item_title = children[1].innerText + " <i>(" + children[2].innerText + ")</i>";
        var item_href = children[1].children[0].href;
        var item_img = children[0].getElementByTagName("img")[0].src;

        page.appendItem(PLUGIN.id + ":moviepage:" + item_href + ":" + item_title, 'video', {
            title: item_title,
            icon: item_img,
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
settings.globalSettings(PLUGIN.id, PLUGIN.title, LOGO, PLUGIN.synopsis);

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

    page.asyncPaginator = loader;
    // -------------------------------

    page.loading = false;
});

new page.Route(PLUGIN.id + ":moviepage:(.*):(.*)", function(page, href, title) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id + " - " + title)
    
    page.loading = true;

    var dom = fetchDOM(href);

    // get details of movie (year, etc..)
    
    var detailsHTML = dom.root.getElementsByClassName("short-cols")[0].children;
    var details = [];
    detailsHTML.forEach(function(item) {
        var detail = item.innerText.replace("\n", "");
        details.push(detail);
    });
    console.log({details: details});

    var imdbRating = dom.root.getElementsByClassName("short-rates")[0].children[0].innerText;
    console.log({imdbRating: imdbRating});

    var img = dom.root.getElementsByClassName("fimg")[0].children[0].src;
    console.log({img: img});

    var description = dom.root.getElementsByClassName("ftext")[0].innerText;
    console.log({description: description});

    // setup info on the page


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