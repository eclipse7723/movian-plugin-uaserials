const http = require('movian/http');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';


function fetchHTML(href, referer) {
    /* returns html code as string */

    var headers = {
        'user-agent': USER_AGENT,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'uk-UA,uk;q=0.9,en;q=0.8',
    };
    if (referer) {
        headers['referer'] = referer;
    }

    var response = http.request(href, {
        'headers': headers,
    });
    logDebug("fetch '" + href + "': status code is " + response.statuscode);

    if (response.statuscode < 200 || response.statuscode >= 300) {
        throw "HTTP " + response.statuscode + " while fetching '" + href + "'";
    }

    response = response.toString();
    return response;
}

function fetchDOM(href) {
    var response = fetchHTML(href);
    return html.parse(response);
}

function fetchDoc(href) {
    /* returns document, methods:
        - getElementById -> object
        - getElementByClassName -> array
        - getElementByTagName -> array
    */
    var dom = fetchDOM(href);
    return dom.root;
}
