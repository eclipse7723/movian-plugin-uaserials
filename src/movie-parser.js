
// TEXT FORMATTING -----------------------------------------------
const COLOR_GRAY = "7F7F7F"

var RichText = function (x) {this.str = x.toString()};
RichText.prototype.toRichString = function (x) {return this.str};

function getColoredFormat(text, color) {
    return '<font color="' + color + '">' + text + '</font>';
}
function formatInfo(text) {
    return getColoredFormat(text, COLOR_GRAY);
}
function formatBold(text) {
    return "<b>" + text + "</b>";
}
// ---------------------------------------------------------------


function parseCollections(page, href) {
    /* Парсит страницы с коллекциями фильмов и сериалов */
    var doc = fetchDoc(href);

    var items = doc.getElementById("dle-content").children;
    items.forEach(function(item) {
        var data = item.children[0];    // tag 'a'
        var children = data.children;   // tags 'img', div 'uas-col-title', div 'uas-col-count'

        const title = children[1].textContent;
        const itemHref = data.attributes.getNamedItem('href').value;
        const itemImg = children[0].attributes.getNamedItem('data-src').value;
        const itemCount = children[2].textContent;
        
        var desc = "";
        desc += formatInfo("Повна назва: " + formatBold(title))
        desc += "\n" + formatInfo("Кількість в цій добірці: " + formatBold(itemCount));
        desc = new RichText(desc);

        page.appendItem(PLUGIN.id + ":collection:" + itemHref + ":" + title.replace(":", ""), 'video', {
            title: title,
            icon: itemImg,
            description: desc,
        });
        page.entries += 1
    });
}


function parseMovies(page, href) {
    /* Парсит краткую инфу про фильмы по указаному адресу (название, иконка) */
    var doc = fetchDoc(href);

    var items = doc.getElementByClassName("short-cols");
    items.forEach(function(item) {
        var children = item.children;
        const titleUa = children[1].textContent;
        const titleEn = children[2].textContent;
        const itemHref = children[0].attributes.getNamedItem('href').value;
        const itemImg = children[0].getElementByTagName("img")[0].attributes.getNamedItem('data-src').value;

        var desc = "";
        if (titleEn) {
            desc += formatInfo("Оригінальна назва: " + formatBold(titleEn));
        }

        const label1 = children[0].getElementByClassName("short-label-level-1")[0]
        if (label1) {
            desc += "\n" + formatInfo("Тип: " + formatBold(label1.children[0].textContent));
        }
        const label2 = children[0].getElementByClassName("short-label-level-2")[0]
        if (label2) {
            desc += "\n" + formatInfo("Кількість: " + formatBold(label2.children[0].textContent));
        }

        desc = new RichText(desc);

        page.appendItem(PLUGIN.id + ":moviepage:" + itemHref + ":" + titleUa.replace(":", " "), 'video', {
            title: titleUa,
            icon: itemImg,
            description: desc,
        });
        page.entries += 1

    });
}


function parseMovie(page, movieData) {
    /* Парсит видео */
    movieData.data.forEach(function(data) {
        if (data.tabName !== "Плеєр") {
            return;
        }
        if (data.hasOwnProperty("seasons")) {
            __parseTvSeries(page, movieData, data.seasons);
        } else if (data.hasOwnProperty("url")) {
            __parseMovieVideo(page, movieData, data.url)
        }
    })
}

/* сериал */

function __parseTvSeries(page, movieData, seasonsData) {
    seasonsData.forEach(function(seasonData) {
        page.appendPassiveItem("separator", "", {
            title: seasonData.title
        });
        seasonData.episodes.forEach(function(episodeData) {
            page.appendItem(PLUGIN.id + ":play-select-sound:" + movieData.title + ":" + seasonData.title + ":" + episodeData.title, "directory", {
                title: episodeData.title
            });
        });
    });
}

function findSoundsByEpisode(movieData, season, episode) {
    var sounds;
    movieData.data.forEach(function(data) {
        if (data.tabName !== "Плеєр") {
            return;
        }

        data.seasons.forEach(function(seasonData) {
            seasonData.episodes.forEach(function(episodeData) {
                if (seasonData.title === season && episodeData.title === episode) {
                    sounds = episodeData.sounds;
                }
            });
        });

    })

    if (!sounds) {
        console.error("Not found sounds for " + movieData.title + " " + season + " " + episode
             + ". Is it really a tv show? Or wrong input.");
    }

    return sounds;
}

function parseTvEpisode(page, movieData, season, episode) {
    const sounds = findSoundsByEpisode(movieData, season, episode);

    if (!sounds) {
        // error handled in `findSoundsByEpisode`
    }

    sounds.forEach(function(data) {
        const playData = JSON.stringify({
            title: movieData.title,
            href: data.url,
            season: season,
            episode: episode
        })
        page.appendItem(PLUGIN.id + ":play:" + playData, "directory", {
            title: data.title
        });
    })
}

/* filters */

function parseFilterQuery(filterData) {
    const filterTemplate = "/f/{query}";
    const possibleFilters = ["year", "imdb", "cat", "country", "channel"];
    var queries = [];

    possibleFilters.forEach(function(filterKey) {
        if (!filterData.hasOwnProperty(filterKey)) return;
        var filterValue = filterData[filterKey];

        if (filterValue.length === 0) return;

        const query = filterKey + "=" + filterValue.join(";");
        queries.push(query);
    })

    return filterTemplate.replace("{query}", queries.join("/"));
}

function parseListFilters(page, tag, title) {
    var pageId = ":list:";

    function putItem(name, filterData) {
        page.appendItem(PLUGIN.id + pageId + tag + ":" + title + ":" + filterData, "directory", {
            title: name
        })
    }

    // скачаем страницу и спарсим оттуда фильтры
    var doc = fetchDoc(href);

    if (!doc.getElementByClassName("filter-block")) {
        throw "Not found filter-block";
    }

    putItem("Усі " + title, "all");

    page.appendPassiveItem("separator", "", {
        title: "Роки"
    });
    putItem("2020+", "year=2020;" + new Date().getFullYear().toString());
    putItem("2010-2019", "year=2010;2019");
    putItem("2000-2009", "year=2000;2009");
    putItem("1920-1999", "year=1920;1999");

    page.appendPassiveItem("separator", "", {
        title: "Рейтинг IMDb"
    });
    putItem("8+", "imdb=8;10");
    putItem("6+", "imdb=6;10");
    putItem("4-6", "imdb=4;6");
    putItem("0-3", "imdb=0;3");

    /* создаем список жанров, стран, телеканалов (если есть) */

    // filter-wrap -> div{3 div.fb-col} -> 2nd div.fb-col -> div.fb-sect
    var items = doc.getElementById("filter-wrap").children[0].children[1].children[1];
    // inside pairs (select, div), ... We need only `select` items,
    // as they contain filter's data (as `option` elements, 1st option always empty) for each key

    items.forEach(function(item) {
        if (item.tagName !== "select") return;
        const filterKey = item.attributes.getNamedItem('name').value; // api key
        const filterName = item.attributes.getNamedItem('data-placeholder').value; // human name

        page.appendPassiveItem("separator", "", {
            title: filterName
        });

        const options = item.children;
        options.forEach(function(option) {
            if (option.tagName !== "option") return;
            const filterValue = option.attributes.getNamedItem('value').value;
            const filterTitle = option.textContent;
            if (filterValue) {
                putItem(filterTitle, filterKey + "=" + filterValue);
            }
        });
    });

}

function appendPossibleFilters(page) { // todo
    /* добавляет возможные фильтры в сайд-меню, указанные на странице (года, жанры, страны и так далее) */
}

/* фильм */

function __parseMovieVideo(page, movieData, videoUrl) {
    const playData = JSON.stringify({
        title: movieData.title,
        href: videoUrl,
    })
    page.appendItem(PLUGIN.id + ":play:" + playData, "directory", {
        title: movieData.title
    });
}

/* трейлер */

function parseTrailer(page, movieData) {
    movieData.data.forEach(function(data) {
        if (data.tabName !== "Трейлер") return;

        page.appendPassiveItem("separator", '', {
            title: "Трейлер (HLS)"
        });

        const playData = JSON.stringify({
            title: movieData.title,
            href: data.url,
        })
        page.appendItem(PLUGIN.id + ":play:" + playData, "directory", {
            title: movieData.title
        });
    })
}

/* видео */

function parseVideoURL(href) {
    const cdnSubstring1 = "://tortuga.wtf/";
    const cdnSubstring2 = "://tortuga.tw/";
    if (!href.match(cdnSubstring1) && !href.match(cdnSubstring2)) {
        console.error("Unknown CDN url '" + href + "' - url must include '" + cdnSubstring1 + "' or '" + cdnSubstring1 + "'");
        return null;
    }

    const HTML = fetchHTML(href);
    const pattern = /file: "(.+)"/;
    const match = HTML.match(pattern);

    if (!match) {
        console.error("Not found video url at '" + href + "' with pattern '" + pattern + "'")
        return null;
    }

    const url = match[1];
    return url;
}

/* paginator */

function createPageLoader(page, searchUrlBuilder, startPageNumber) {
    const itemsPerPage = 18;
    var nextPageNumber = startPageNumber;
    var hasNextPage = true;

    page.entries = 0;

    function loader() {
        if (!hasNextPage) { return false; }
    
        page.loading = true;
        var url = searchUrlBuilder(nextPageNumber);
        
        const expectedEntries = page.entries + itemsPerPage;
        
        try {
            parseMovies(page, url);
        } catch (e) {
            console.error("loading page " + nextPageNumber + " failed -> " + href + ":" + e)
            hasNextPage = false;
            page.loading = false;
            return false;
        }
        
        if (page.entries !== expectedEntries) {
            hasNextPage = false;
            page.loading = false;
            return false;
        }
    
        nextPageNumber++;
        page.loading = false;
        return true;
    }

    return loader;
}