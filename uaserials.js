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

function parseMovies(page, href) {
    let response = http.request(href, {
        'headers': {
            'user-agent': USER_AGENT,
        },
    });
    response = response.toString()
    let dom = html.parse(response);
    let items = dom.root.getElementsByClassName("short-cols")

    items.forEach(function(item) {
        let children = item.children;
        let item_title = children[1].innerText + " (" + children[2].innerText + ")";
        let item_href = children[1].children[0].href;
        let item_img = children[0].getElementByTagName("img")[0].src;

        page.appendItem(`${PLUGIN.id}:moviepage:${item_href}:${item_title}`, 'video', {
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
    setPageHeader(page, "directory", PLUGIN.id)
    page.loading = false;

    // page.appendItem(plugin.id + ':search:', 'search', {
    //     title: "Пошук " + plugin.id,
    // });

    page.appendItem(`${PLUGIN.id}:list:/series:Серіали`, 'directory', {
        title: "Серіали",
    });
    page.appendItem(`${PLUGIN.id}:list:/films:Фільми`, 'directory', {
        title: "Фільми",
    });
    page.appendItem(`${PLUGIN.id}:list:/cartoons:Мультсеріали`, 'directory', {
        title: "Мультсеріали",
    });
    page.appendItem(`${PLUGIN.id}:list:/fcartoons:Мультфільми`, 'directory', {
        title: "Мультфільми",
    });
    page.appendItem(`${PLUGIN.id}:list:/anime:Аніме`, 'directory', {
        title: "Аніме",
    });
});


new page.Route(PLUGIN.id + ":list:(.*):(.*)", function(page, href, title) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, `${PLUGIN.id} - ${title}`);
    
    page.loading = true;
    parseMovies(page, BASE_URL + href)

    // pagination --------------------
    function generateSearchURL(nextPage) {
        return BASE_URL + href + `/page/${nextPage}/`
    }
    let nextPageNumber = 2;

    function loader() {
        let url = generateSearchURL(nextPageNumber);

        parseMovies(page, url);
        nextPageNumber++;

        // todo: check if next page exists
    }

    page.asyncPaginator = loader;
    // -------------------------------

    page.loading = false;
});


new page.Route(PLUGIN.id + ":moviepage:(.*):(.*)", function(page, href, title) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, `${PLUGIN.id} - '${title}'`)
    
    page.loading = true;

    // todo: show details about movie

    page.loading = false;

});

new page.Route(PLUGIN.id + ':play:(.*):(.*)', function(page, href, title) {
    setPageHeader(page, "video", `${PLUGIN.id} - '${title}'`)

    page.redirect(href);
});


new page.Searcher(PLUGIN.id, PLUGIN_LOGO, function(page, query) {
    setPageHeader(page, DEFAULT_PAGE_TYPE, PLUGIN.id)

    page.loading = true;

    let searchUrl = BASE_URL + "/index.php?do=search&story=" + query
    let nextPageNumber = 1;

    function loader() {
        page.loading = true;
        let url = searchUrl + "&search_start=" + nextPageNumber;

        parseMovies(page, url);
        nextPageNumber++;

        // todo: check if next page exists
        page.loading = false;
    }

    page.asyncPaginator = loader;

    page.loading = false;

});