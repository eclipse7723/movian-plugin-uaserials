
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


function parseMovies(page, href) {
    /* Парсит краткую инфу про фильмы по указаному адресу (название, иконка) */
    var doc = fetchDoc(href);

    var items = doc.getElementByClassName("short-cols");
    items.forEach(function(item) {
        var children = item.children;
        const titleUa = children[1].textContent;
        const titleEn = children[2].textContent;
        var itemTitle = titleUa;
        // itemTitle += " " + i("(" + titleEn + ")");
        const itemHref = children[0].attributes.getNamedItem('href').value;
        const itemImg = children[0].getElementByTagName("img")[0].attributes.getNamedItem('data-src').value;

        page.appendItem(PLUGIN.id + ":moviepage:" + itemHref + ":" + itemTitle.replace(":", " "), 'video', {
            title: itemTitle,
            icon: itemImg,
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
            title: "Трейлер"
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