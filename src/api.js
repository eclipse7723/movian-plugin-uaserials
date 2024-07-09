const http = require('movian/http');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';


function fetchHTML(href) {
    /* returns html code as string */

    var response = http.request(href, {
        'headers': {
            'user-agent': USER_AGENT,
        },
    });
    logDebug("fetch '" + href + "': status code is " + response.statuscode);

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