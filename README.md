# movian-uaserials-plugin
https://uaserials.pro/ integration for Movian

## Build and Install

Check Releases for new versions. If there is nothing or you want newest version, please clone repository and follow instructions below.

Run `build.py` and move zip file into Movian - do not unzip. Open "Plugins", find file and click install.

---

### Movian plugin how-to

#### Important

* plugins should be zipped into `.zip` file with `plugin.json` as required file, source code `.js` and logo (any image or `.svg`).

#### NOT WORKING:

* \`${x}\` - text formatting;
* `let` keyword;

#### html parsing

* movian/html based on C-library Gumbo!

```javascript
const http = require('movian/http');
const html = require('movian/html');    // !!! gumbo
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function fetchDOM(href) {
    /* returns document, methods:
        - getElementById -> object
        - getElementByClassName -> array
        - getElementByTagName -> array
    */

    var response = http.request(href, {
        'headers': {
            'user-agent': USER_AGENT,
        },
    });

    response = response.toString();
    var dom = html.parse(response);

    return dom.root;
}

const document = fetchDOM("...");
// get innerText of specific element with `.textContent`:
const title = document.getElementByClassName("ftitle")[0].textContent;  
// tag attributes we can get with `item.attributes.getNamedItem("attribute-name").value`, i.e.:
const url = document.getElementByClassName("fposter")[0].getElementByTagName("img")[0].attributes.getNamedItem("src").value;

```
