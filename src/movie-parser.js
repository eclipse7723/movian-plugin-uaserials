
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
    /* makes query string from given filterData object */

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
    /* creates buttons with filters on page */

    function putItem(name, filterData) {
        page.appendItem(PLUGIN.id + ":list:" + tag + ":" + title + ":" + filterData, "directory", {
            title: name + " ▶"
        });
    }
    function putSeparator(name) {
        page.appendPassiveItem("separator", "", {
            title: name
        });
    }

    // скачаем страницу и спарсим оттуда фильтры
    const href = BASE_URL + tag;
    var doc = fetchDoc(href);

    if (!doc.getElementByClassName("filter-block")) {
        throw "Not found filter-block";
    }

    // подготовленные фильтры

    const thisYear = new Date().getFullYear().toString()
    putSeparator("Рік прем'єри")
    putItem("Цього року", "year=" + thisYear + ";" + thisYear);
    putItem("2020+", "year=2020;" + thisYear);
    putItem("2010-2019", "year=2010;2019");
    putItem("2000-2009", "year=2000;2009");
    putItem("1920-1999", "year=1920;1999");

    putSeparator("Рейтинг IMDb")
    putItem("9+", "imdb=9;10");
    putItem("8+", "imdb=8;10");
    putItem("6+", "imdb=6;10");
    putItem("4-6", "imdb=4;6");
    putItem("0-3", "imdb=0;3");

    /* создаем список жанров, стран, телеканалов (если есть) */

    const allowedFilters = ["genre", "cat", "year", "imdb"];   // skip "channel" from parse
    const noGenresCategories = ["Мультсеріали", "Мультфільми"];

    // filter-wrap -> div.filter-box -> div{3 div.fb-col} -> 2nd div.fb-col -> div.fb-sect
    var items = doc.getElementById("filter-wrap").children[0].children[1].children[1];
    // inside pairs (select, div), ... We need only `select` items,
    // as they contain filter's data (as `option` elements, 1st option always empty) for each key

    var hasChannels = false;

    items.getElementByTagName("select").forEach(function(item) {
        const filterKey = item.attributes.getNamedItem('name').value; // api key
        const filterName = item.attributes.getNamedItem('data-placeholder').value; // human name

        if (filterKey === "channel") {
            hasChannels = true;
        }

        // excluded filter
        if (allowedFilters.indexOf(filterKey) === -1) return;

        // probably this filter is useless for this category of movies
        if (filterKey === "genre" && noGenresCategories.indexOf(title) !== -1) return;

        putSeparator(filterName);

        var entries = 0;
        item.children.forEach(function(option) {
            const itemName = option.textContent;
            if (!itemName) return; // empty value

            var itemValue = itemName;  // in case if api value = title
            if (option.attributes.getNamedItem('value')) {
                itemValue = option.attributes.getNamedItem('value').value;
            }

            putItem(itemName, filterKey + "=" + itemValue);
            entries += 1;
        });
    });

    if (hasChannels) {
        putSeparator("Телеканал");
        
        // channels with 18 and more movies (some exceptions to young but popular channels)
        const popularChannels = [
            "Netflix", "BBC", "Amazon", "Apple TV+", "HBO", "FX", "Hulu", "CBS", "Paramount+",
            "Nickelodeon", "AMC", "Disney", "National Geographic", "Fox", "Sci Fi Channel", "DC Universe",
            "Discovery", "Showtime", "NBC", "The CW", "ABC", "ITV", "Peacock", "Channel 4", "Cartoon Network",
            "Starz", "USA Network", "Sky Atlantic", "Rai 1", "TNT", "Sky1", "Syfy", "Comedy Central",
            "ZDF", "TF1", "France 2", "CBC", "YouTube Premium", "1+1"
        ]

        popularChannels.forEach(function(channel) {
            putItem(channel, "channel=" + channel.replace("+", "ppp"));
        })
    }

}

function appendPossibleFilters(page) { // todo
    /* добавляет возможные фильтры в сайд-меню, указанные на странице (года, жанры, страны и так далее) */
}

/* main page list */

function parseListFromMain(page, tag, title) {
    // todo
    throw "not realized yet"
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
    /* adds trailer button if possible */
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
    const allowedCDNs = ["://tortuga.wtf/", "://tortuga.tw/"]

    var isValidSource = false;
    for (var i in allowedCDNs) {
        const cdnSubstring = allowedCDNs[i];
        if (href.match(cdnSubstring)) {
            isValidSource = true;
            break;
        }
    }
    if (!isValidSource) {
        console.error("Unknown CDN url '" + href + "' - url must include one of " + allowedCDNs.join(" or "))
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
        if (!hasNextPage) return false;

        page.loading = true;
        var url = searchUrlBuilder(nextPageNumber);

        const expectedEntries = page.entries + itemsPerPage;

        try {
            parseMovies(page, url);
        } catch (e) {
            console.error("loading page " + nextPageNumber + " failed -> " + url + ":" + e)
            hasNextPage = false;
            page.loading = false;
            return false;
        }

        if (parseInt(page.entries) !== expectedEntries) {
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