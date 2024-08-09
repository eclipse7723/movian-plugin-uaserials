
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
        var desc = new RichText(desc);

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

        var desc = new RichText(desc);

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
                if (seasonData.title == season && episodeData.title == episode) {
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
        // console.error("Not found sounds for " + season + " " + episode)
    }

    sounds.forEach(function(data) {
        page.appendItem(PLUGIN.id + ":play:" + data.url + ":" + movieData.title, "directory", {
            title: data.title
        });
    })
}

/* фильм */

function __parseMovieVideo(page, movieData, videoUrl) {
    page.appendItem(PLUGIN.id + ":play:" + videoUrl + ":" + movieData.title, "directory", {
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
        page.appendItem(PLUGIN.id + ":play:" + data.url + ":" + movieData.title, "directory", {
            title: movieData.title
        });
    })
}

/* видео */

function parseVideoURL(href) {
    const cdnSubstring = "://tortuga.wtf/vod/"
    if (!href.match(cdnSubstring)) {
        console.error("Unknown CDN url '" + href + "' - url must include '" + cdnSubstring + "'")
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
        
        if (page.entries != expectedEntries) {
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