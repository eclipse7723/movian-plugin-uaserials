function parseCollections(page, href) {
    /* Парсит страницы с коллекциями фильмов и сериалов */
    const doc = fetchDoc(href);

    const items = doc.getElementById("dle-content").children;
    items.forEach(function(item) {
        const data = item.children[0];    // tag 'a'
        const children = data.children;   // tags 'img', div 'uas-col-title', div 'uas-col-count'

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


function parseMovieItem(page, item) {
    /* добавляет элемент фильма на страницу. item = div.short-cols */

    const children = item.children;
    const link = item.getElementByTagName("a")[0];
    const image = link.getElementByTagName("img")[0];
    const titleUaNode = item.getElementByClassName("th-title")[0];
    const titleEnNode = item.getElementByClassName("th-title-oname")[0];
    const titleUa = titleUaNode ? titleUaNode.textContent : image.attributes.getNamedItem('alt').value;
    const titleEn = titleEnNode ? titleEnNode.textContent : "";
    const itemHref = link.attributes.getNamedItem('href').value;
    const lazySrc = image.attributes.getNamedItem('data-src');
    const src = image.attributes.getNamedItem('src');
    const itemImg = lazySrc ? lazySrc.value : (src ? src.value : "");

    var desc = "";
    if (titleEn) {
        desc += formatInfo("Оригінальна назва: " + formatBold(titleEn));
    }

    const label1 = link.getElementByClassName("short-label-level-1")[0]
    if (label1) {
        desc += "\n" + formatInfo("Тип: " + formatBold(label1.children[0].textContent));
    }
    const label2 = link.getElementByClassName("short-label-level-2")[0]
    if (label2) {
        desc += "\n" + formatInfo("Кількість: " + formatBold(label2.children[0].textContent));
    }

    page.appendItem(PLUGIN.id + ":moviepage:" + itemHref + ":" + titleUa.replace(":", " "), 'video', {
        title: titleUa,
        icon: itemImg,
        description: new RichText(desc),
    });
    page.entries += 1
}


function parseMovies(page, href) {
    /* Парсит краткую инфу про фильмы по указанному адресу (название, иконка) */
    const doc = fetchDoc(href);

    const items = doc.getElementByClassName("short-cols");
    items.forEach(function(item) {
        parseMovieItem(page, item);
    });
    return items.length;
}

function parseAnimeItems(page, href, animeType) {
    const doc = fetchDoc(href);
    const items = doc.getElementByClassName("short-cols");

    items.forEach(function(item) {
        const labels = item.getElementByClassName("short-label-level-1");
        const label = labels.length ? labels[0].textContent.toLowerCase() : "";
        const isSeries = label.indexOf("сезон") !== -1 || label.indexOf("сері") !== -1;

        if ((animeType === "series" && isSeries) || (animeType === "movie" && !isSeries)) {
            parseMovieItem(page, item);
        }
    });

    // The paginator must follow source pages even when only some cards match.
    return items.length;
}

function parseSearchResults(page, href) {
    const doc = fetchDoc(href);
    const items = doc.getElementByClassName("uas-card");

    items.forEach(function(item) {
        const titleNode = item.getElementByClassName("uas-card__title")[0];
        const originalNode = item.getElementByClassName("uas-card__orig")[0];
        const image = item.getElementByClassName("uas-card__img")[0];
        const yearNode = item.getElementByClassName("uas-card__year")[0];
        const ratingNode = item.getElementByClassName("uas-card__rating")[0];
        const hrefAttr = item.attributes.getNamedItem("href");

        if (!titleNode || !image || !hrefAttr) {
            return;
        }

        const title = titleNode.textContent;
        const lazySrc = image.attributes.getNamedItem("data-src");
        const src = image.attributes.getNamedItem("src");
        var icon = lazySrc ? lazySrc.value : (src ? src.value : "");
        if (icon.charAt(0) === "/") {
            icon = BASE_URL + icon;
        }

        var description = originalNode ? originalNode.textContent : "";
        if (yearNode) {
            description += (description ? "\n" : "") + "Рік: " + yearNode.textContent;
        }
        if (ratingNode) {
            description += (description ? "\n" : "") + "IMDb: " + ratingNode.textContent;
        }

        page.appendItem(
            PLUGIN.id + ":moviepage:" + hrefAttr.value + ":" + title.replace(":", " "),
            "video",
            {
                title: title,
                icon: icon,
                description: description,
            }
        );
        page.entries += 1;
    });

    return items.length;
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
            page.appendItem(PLUGIN.id + ":play-select-sound:" + movieData.title + ":" + seasonData.title + ":" + episodeData.title, "video", {
                title: episodeData.title,
                icon: currentMovieData["img"],
                description: seasonData.title + ', ' + episodeData.title
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

function parseTvEpisodes(page, movieData, season, episode) {
    const sounds = findSoundsByEpisode(movieData, season, episode);

    if (!sounds) {
        // error handled in `findSoundsByEpisode`
        page.appendPassiveItem("separator", '', {
            title: "Немає озвучок або щось пішло не так :("
        });
        return;
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
        page.entries += 1;
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
        const filterValue = filterData[filterKey];

        if (filterValue.length === 0) return;

        const query = filterKey + "=" + filterValue.join(";");
        queries.push(query);
    })

    return filterTemplate.replace("{query}", queries.join("/"));
}

function __parseFilters(filters) {
    const possibleFilters = ["year", "imdb", "cat", "country", "channel"];

    filters = filters.split(";");
    if (filters.length === 0) {
        filters = possibleFilters;
    } else {
        // validate given filters
        for (var i in filters) {
            const filterKey = filters[i];
            if (possibleFilters.indexOf(filterKey) === -1) {
                throw "Unknown filter key: " + filterKey;
            }
        }
    }
    return filters;
}

function parseListFilters(page, tag, title, filters) {
    /* creates buttons with filters on page */

    filters = __parseFilters(filters);

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

    // подготовленные фильтры

    if (filters.indexOf("year") !== -1) {
        const thisYear = new Date().getFullYear().toString()

        putSeparator("Рік прем'єри")
        putItem("Цього року", "year=" + thisYear + ";" + thisYear);
        putItem("2020+", "year=2020;" + thisYear);
        putItem("2010-2019", "year=2010;2019");
        putItem("2000-2009", "year=2000;2009");
        putItem("1990-2010", "year=1990;2010");
        putItem("1920-1999", "year=1920;1999");
    }
    if (filters.indexOf("imdb") !== -1) {
        putSeparator("Рейтинг IMDb")
        putItem("9+", "imdb=9;10");
        putItem("8+", "imdb=8;10");
        putItem("6+", "imdb=6;10");
        putItem("4-6", "imdb=4;6");
        putItem("0-3", "imdb=0;3");
    }

    /* создаем список жанров, стран, телеканалов (если есть) */

    const allowedParsingFilters = ["cat", "year", "country", "imdb"];

    // if no filters in allowedParsingFilters, return
    var shouldParseFilters = false;
    for (var i in filters) {
        const filterKey = filters[i];
        if (allowedParsingFilters.indexOf(filterKey) !== -1 || filterKey === "channel") {
            shouldParseFilters = true;
            break;
        }
    }
    if (shouldParseFilters === false) {
        return;
    }

    // скачаем страницу и спарсим оттуда фильтры
    const href = BASE_URL + tag;
    const doc = fetchDoc(href);

    if (!doc.getElementByClassName("filter-block")) {
        throw "Not found filter-block";
    }

    // filter-wrap -> div.filter-box -> div{3 div.fb-col} -> 2nd div.fb-col -> div.fb-sect
    const items = doc.getElementById("filter-wrap").children[0].children[1].children[1];
    // inside pairs (select, div), ... We need only `select` items,
    // as they contain filter's data (as `option` elements, 1st option always empty) for each key

    var hasChannels = false;

    items.getElementByTagName("select").forEach(function(item) {
        const filterKey = item.attributes.getNamedItem('name').value; // api key
        const filterName = item.attributes.getNamedItem('data-placeholder').value; // human name

        if (filterKey === "channel") {
            hasChannels = true;
        }

        // excluded filters from parsing
        if (allowedParsingFilters.indexOf(filterKey) === -1) return;

        // not in the display list
        if (filters.indexOf(filterKey) === -1) return;

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

    if (hasChannels && filters.indexOf("channel") !== -1) {
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
    throw "not realized yet"
}

/* main page list */

function parseListFromMain(page, tag, title) {
    /* добавляет на страницу список фильмов с главной страницы */

    const href = BASE_URL;
    const doc = fetchDoc(href);

    const items = doc.getElementByClassName("sect");

    items.forEach(function(item) {
        const sectionTitle = item.children[0].textContent;
        if (sectionTitle !== title) return;

        const sectionContent = item.children[1].getElementByClassName("short-cols");

        sectionContent.forEach(function(sectionItem) {
            parseMovieItem(page, sectionItem);
        })
    });
}

/* фильм */

function __parseMovieVideo(page, movieData, videoUrl) {
    const tortugaPlaylist = parseTortugaPlaylist(videoUrl);
    if (tortugaPlaylist) {
        __parseTortugaSeries(page, movieData, tortugaPlaylist);
        return;
    }

    const playData = JSON.stringify({
        title: movieData.title,
        href: videoUrl,
    })
    page.appendItem(PLUGIN.id + ":play:" + playData, "video", {
        title: movieData.title,
        icon: currentMovieData["img"],
        description: 'Нажміть "Х", щоб почати перегляд відео...',
    });
}

function __parseTortugaSeries(page, movieData, seasons) {
    seasons.forEach(function(season) {
        page.appendPassiveItem("separator", "", {
            title: season.title || ("Сезон " + season.number)
        });

        const episodes = season.folder || [];
        episodes.forEach(function(episode) {
            const streams = extractTortugaStreams(episode.file);
            if (!streams.length) {
                console.error("Tortuga stream not found for " + season.title + " " + episode.title);
                return;
            }

            const episodeData = {
                title: movieData.title,
                season: season.title || ("Сезон " + season.number),
                episode: episode.title,
                icon: episode.poster || movieData.img,
            };

            if (streams.length > 1) {
                episodeData.streams = streams;
                page.appendItem(
                    PLUGIN.id + ":play-select-tortuga-sound:" + encodeURIComponent(JSON.stringify(episodeData)),
                    "directory",
                    {
                        title: episode.title + " — обрати озвучку",
                        icon: episodeData.icon,
                        description: episodeData.season,
                    }
                );
                page.entries += 1;
                return;
            }

            const stream = streams[0];
            const playData = JSON.stringify({
                title: episodeData.title,
                href: stream.url,
                subtitles: stream.subtitles,
                season: episodeData.season,
                episode: episodeData.episode,
            });
            page.appendItem(PLUGIN.id + ":play:" + playData, "video", {
                title: episode.title + (stream.voice ? " — " + stream.voice : ""),
                icon: episodeData.icon,
                description: episodeData.season,
            });
            page.entries += 1;
        });
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

function decodeTortugaFileToken(token) {
    const data = CryptoJS.enc.Base64.parse(token);
    if (!data || data.sigBytes < 2) {
        return null;
    }

    function byteAt(index) {
        return (data.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff;
    }

    // The first decoded byte is a random seed. Every following byte is the
    // URL byte XORed with seed + 13 + 7 * position (modulo 256).
    const seed = byteAt(0);
    var resultWords = [];
    var resultLength = data.sigBytes - 1;
    for (var i = 1; i < data.sigBytes; i++) {
        const key = (seed + 13 + 7 * (i - 1)) & 0xff;
        const decodedByte = byteAt(i) ^ key;
        const resultIndex = i - 1;
        resultWords[resultIndex >>> 2] |= decodedByte << (24 - (resultIndex % 4) * 8);
    }
    return CryptoJS.enc.Utf8.stringify(CryptoJS.lib.WordArray.create(resultWords, resultLength));
}

function loadTortugaFile(href) {
    const HTML = fetchHTML(href, BASE_URL + "/");
    const pattern = /file\s*:\s*["']([^"']+)["']/;
    const match = HTML.match(pattern);
    if (!match) {
        console.error("Not found Tortuga file value at '" + href + "'");
        return null;
    }

    const file = match[1];
    if (/^https?:\/\//.test(file)) {
        return {file: file, value: file};
    }

    try {
        return {file: file, value: decodeTortugaFileToken(file)};
    } catch (e) {
        console.error("Failed to decode Tortuga token locally: " + e);
        return {file: file, value: null};
    }
}

function extractTortugaStreams(file) {
    const value = String(file || "");
    const streams = [];
    const labelledStreamPattern = /\{([^}]+)\}\s*(https?:\/\/.*?)(?=\{[^}]+\}|$)/g;
    var labelledMatch;

    while ((labelledMatch = labelledStreamPattern.exec(value)) !== null) {
        const labelledUrl = labelledMatch[2].match(/https?:\/\/[^\s,)"']+\.m3u8(?:\?[^\s,)"']*)?/);
        if (labelledUrl) {
            streams.push({
                url: labelledUrl[0],
                voice: labelledMatch[1],
                subtitles: extractTortugaSubtitles(labelledMatch[2]),
            });
        }
    }

    if (streams.length) {
        return streams;
    }

    const urlMatch = value.match(/https?:\/\/[^\s,)"']+\.m3u8(?:\?[^\s,)"']*)?/);
    return urlMatch ? [{url: urlMatch[0], voice: "", subtitles: extractTortugaSubtitles(value)}] : [];
}

function extractTortugaSubtitles(value) {
    const subtitles = [];
    const subtitlePattern = /\[([^\]]+)\](https?:\/\/[^\s\[\])"']+\.vtt(?:\?[^\s\[\])"']*)?)/g;
    var match;

    while ((match = subtitlePattern.exec(String(value || ""))) !== null) {
        const title = match[1];
        const normalizedTitle = title.toLowerCase();
        var language = "";
        if (normalizedTitle.indexOf("укра") !== -1) {
            language = "uk";
        } else if (normalizedTitle.indexOf("англ") !== -1) {
            language = "en";
        }
        subtitles.push({
            title: title,
            language: language,
            source: "Tortuga",
            url: match[2],
        });
    }

    return subtitles;
}

function parseTortugaPlaylist(href) {
    if (!href.match(/:\/\/tortuga\.(wtf|tw)\//)) {
        return null;
    }

    const loaded = loadTortugaFile(href);
    if (!loaded || !loaded.value || loaded.value.charAt(0) !== "[") {
        return null;
    }

    try {
        const playlist = JSON.parse(loaded.value);
        return playlist && playlist.length ? playlist : null;
    } catch (e) {
        console.error("Failed to parse Tortuga series playlist: " + e);
        return null;
    }
}

function parseVideoURL(href) {
    // Episode entries parsed from a Tortuga playlist already contain HLS.
    if (/^https?:\/\/[^\s]+\.m3u8(?:\?[^\s]*)?$/.test(href)) {
        return href;
    }

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

    const loaded = loadTortugaFile(href);
    if (!loaded) {
        return null;
    }

    const file = loaded.file;

    // Old Tortuga pages exposed the media URL directly.
    if (/^https?:\/\//.test(file)) {
        return file;
    }

    // Current Tortuga tokens can be decoded locally. This is also required
    // on PS3: get2.fun returns HTTP 204 to Movian's old HTTP client.
    const localVideoUrl = loaded.value;
    if (/^https?:\/\//.test(localVideoUrl)) {
        logDebug("Tortuga token decoded locally: " + localVideoUrl);
        return localVideoUrl;
    }

    // Fallback for a future token format: reproduce the browser resolver.
    function base64Encode(value) {
        return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(value));
    }
    function base64Decode(value) {
        return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(value));
    }

    const encodedToken = base64Encode(base64Encode(file));
    const resolverUrl = "https://get2.fun/point/?method=video_link2&xl=" + encodeURIComponent(encodedToken);
    const resolverResponse = http.request(resolverUrl, {
        headers: {
            'user-agent': USER_AGENT,
            'accept': '*/*',
            'referer': href,
            'origin': href.match(/^(https?:\/\/[^/]+)/)[1],
        },
    });

    logDebug("resolve Tortuga token: status code is " + resolverResponse.statuscode);
    if (resolverResponse.statuscode < 200 || resolverResponse.statuscode >= 300) {
        console.error("Tortuga resolver returned HTTP " + resolverResponse.statuscode);
        return null;
    }

    const encodedUrl = resolverResponse.toString().replace(/^\s+|\s+$/g, "");
    if (!encodedUrl) {
        console.error("Tortuga resolver returned an empty response");
        return null;
    }

    try {
        const videoUrl = base64Decode(base64Decode(encodedUrl));
        if (!/^https?:\/\//.test(videoUrl)) {
            console.error("Tortuga resolver returned an invalid video URL");
            return null;
        }
        return videoUrl;
    } catch (e) {
        console.error("Failed to decode Tortuga video URL: " + e);
        return null;
    }
}

/* paginator */

function createPageLoader(page, searchUrlBuilder, startPageNumber, pageParser) {
    const itemsPerPage = 18;
    var nextPageNumber = startPageNumber;
    var hasNextPage = true;

    page.entries = 0;

    function loader() {
        if (!hasNextPage) return false;

        page.loading = true;
        const url = searchUrlBuilder(nextPageNumber);

        var sourceEntries;
        try {
            sourceEntries = pageParser ? pageParser(page, url) : parseMovies(page, url);
        } catch (e) {
            console.error("loading page " + nextPageNumber + " failed -> " + url + ":" + e)
            hasNextPage = false;
            page.loading = false;
            return false;
        }

        if (sourceEntries !== itemsPerPage) {
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
