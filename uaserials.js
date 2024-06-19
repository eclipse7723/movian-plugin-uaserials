/* IMPORTS */

const service = require('movian/service');
const settings = require('movian/settings');
const page = require('movian/page');
const http = require('movian/http');

/* CONSTANTS */

const pluginDescriptor = JSON.parse(Plugin.manifest);
// plugin constants
const PLUGIN_PREFIX = pluginDescriptor.id;
const PLUGIN_TITLE = pluginDescriptor.title;
const PLUGIN_SYNOPSIS = pluginDescriptor.synopsis;
const PLUGIN_AUTHOR = pluginDescriptor.author;
const PLUGIN_VERSION = pluginDescriptor.version;
const PLUGIN_LOGO = Plugin.path + pluginDescriptor.icon;
const BASE_URL = "https://" + Plugin.base_url;
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
        page.appendItem(PLUGIN_PREFIX + ":moviepage:" + item_href, 'video', {
            title: item_title,
            icon: item_img,
        });

    });
}

// Create the service (ie, icon on home screen)
service.create(PLUGIN_TITLE, PLUGIN_PREFIX + ':start', 'video', true, PLUGIN_LOGO);

settings.globalSettings(plugin.id, plugin.title, LOGO, plugin.synopsis);

/* PAGES */

new page.Route(PLUGIN_PREFIX + ":start", function(page) {
    page.loading = true;

    page.type = 'directory';
    page.metadata.title = PLUGIN_PREFIX
    page.metadata.icon = Plugin.path + 'logo.svg';
    page.metadata.logo = Plugin.path + 'logo.svg';

    // page.appendItem(PLUGIN_PREFIX + ':search:', 'search', {
    //     title: "Пошук " + PLUGIN_PREFIX,
    // });

    page.appendItem(PLUGIN_PREFIX + ":list:/series", 'directory', {
        title: "Серіали",
    });
    page.appendItem(PLUGIN_PREFIX + ":list:/films", 'directory', {
        title: "Фільми",
    });
    page.appendItem(PLUGIN_PREFIX + ":list:/cartoons", 'directory', {
        title: "Мультсеріали",
    });
    page.appendItem(PLUGIN_PREFIX + ":list:/fcartoons", 'directory', {
        title: "Мультфільми",
    });
    page.appendItem(PLUGIN_PREFIX + ":list:/anime", 'directory', {
        title: "Аніме",
    });

    page.loading = false;
});


new page.Route(PLUGIN_PREFIX + ":list:(.*)", function(page, href, title) {
    page.loading = true;

    page.type = 'directory';
    page.metadata.title = title
    page.metadata.icon = Plugin.path + 'logo.svg';
    page.metadata.logo = Plugin.path + 'logo.svg';

    parseMovies(page, BASE_URL + href)

    // pagination --------------------
    function generateSearchURL(nextPage) {
        return BASE_URL + href + `/page/${nextPage}/`
    }
    let nextPageNumber = 2;

    function paginator() {
        let url = generateSearchURL(nextPageNumber);

        parseMovies(page, url);
        nextPageNumber++;

        // todo: check if next page exists
    }

    page.asyncPaginator = paginator;
    // -------------------------------

    page.loading = false;
});


new page.Route(PLUGIN_PREFIX + ":moviepage:(.*):(.*)", function(page, title, href) {
    page.loading = true;

    page.type = 'directory';
    page.metadata.title = PLUGIN_PREFIX + ": " + title;
    page.metadata.icon = Plugin.path + 'logo.svg';
    page.metadata.logo = Plugin.path + 'logo.svg';

    page.loading = false;

});

new page.Route(PLUGIN_PREFIX + ':play:(.*)', function(page, href) {
    page.type = 'video';
    page.metadata.title = PLUGIN_PREFIX;
    page.metadata.icon = Plugin.path + 'logo.svg';
    page.metadata.logo = Plugin.path + 'logo.svg';

    page.redirect(href);
});


new page.Searcher(PLUGIN_PREFIX + "- Results", PLUGIN_LOGO, function(page, query) {
    page.loading = true;

    page.type = 'directory';
    page.metadata.title = PLUGIN_PREFIX
    page.metadata.icon = Plugin.path + 'logo.svg';
    page.metadata.logo = Plugin.path + 'logo.svg';

    let searchUrl = BASE_URL + "/index.php?do=search&story=" + query
    let nextPageNumber = 1;

    function paginator() {
        let url = searchUrl + "&search_start=" + nextPageNumber;

        parseMovies(page, url);
        nextPageNumber++;

        // todo: check if next page exists
    }

    page.asyncPaginator = paginator;


});