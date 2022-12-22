console.log('This is the background page.');
console.log('Put the background scripts here.');

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log('downloading...');
        chrome.downloads.download({
            url: request.url,
            filename: request.name
        });
        sendResponse({done: "successful"});
        return true;
    }
);

const getCourseData = async (callback, path) => {
    console.log("test");
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    var domain = getDomain(tab.url);
    console.log(domain);
    // console.log("domain=["+domain+"]")
    const cookies = [];
    chrome.cookies.getAll({}, function(c) {
        for (var i in c) {
            if (c[i].domain.indexOf(domain) != -1) {
                cookies.push(c[i]);
            }
        }
    });
}

function getDomain(url) {
    return url.match(/:\/\/(.[^/:#?]+)/)[1];
  }
