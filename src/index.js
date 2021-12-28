const http = require("http");
const jwt = require("jsonwebtoken");
const urllib = require("urllib");

const config = require("./config.json");
var filesDict = {};
var cache = null;

setTimeout(() => cache = null, config.cacheCleanerTimer);

const getDefJson = function() {
    let files = [];
    return new Promise((resolve, reject) => {
        if (cache == null) {
            urllib.request(config.configsUrl, {method: "GET"}, (err, data, res) => {
                if (data && res.status == 200) {
                    let result = JSON.parse(data.toString());
                    for (let i in result) {
                        let doc = result[i];
                        files[doc.id] = doc;
                    }
                }
                cache = files;
                resolve(files);
            });
        } else {
            resolve(cache);
        }
    });
};

const generateKey = function () {
    let key = '';
    while (key.length < 30) {
        key +=  Math.floor(Math.random() * 10);
    }
    return key;
};

const configHandler = async function (req, res, params) {
    if (config.configsUrl) {
        await getDefJson().then((result) => {
            filesDict = result;
        });
    } else {
        res.writeHead(404);
        res.end();
        return;
    }

    let docId = params[0];
    if (!docId || !filesDict[docId]) {
        res.writeHead(404);
        res.end();
        return;
    }

    let doc = filesDict[docId];

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.writeHead(200);
    let sbtrUrl = config.configsUrl.charAt(config.configsUrl.lastIndexOf('/') - 1) == '/' ? config.configsUrl : config.configsUrl.substring(0, config.configsUrl.lastIndexOf('/'));
    let url = /(http(s?)):\/\//.test(doc.link_oform_filling_file) ? doc.link_oform_filling_file : sbtrUrl + doc.link_oform_filling_file;

    let docConfig = {
        document: {
            key: 'oform_' + generateKey(),
            fileType: "oform",
            title: doc.name,
            url: url,
            permissions: {
                edit: false,
                fillForms: true,
            },
        },
        editorConfig: {
            callbackurl: config.serviceUrl + "/callback",
            customization: {
                anonymous: {
                    request: false
                },
            }
        },
        documentType: "word",
        height: "100%",
        width: "100%",
    };

    docConfig.token = jwt.sign(docConfig, config.jwtSecret);

    res.end(JSON.stringify(docConfig));
}

const callbackHandler = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ error: 0 }));
};

const routes = [
    {
        route: /callback[\/]?/, handler: callbackHandler
    },
    {
        route: /\/config\/(\d+)[\/]?/, handler: configHandler
    }
];

const requestListener = function (req, res) {
    try {
        for (let i in routes) {
            let elem = routes[i];
            let result = elem.route.exec(req.url);
            if (result) {
                elem.handler(req, res, result.slice(1));
                return;
            }
        }
    } catch (e) {
        console.log(e);
        res.writeHead(500);
        res.end();
    }

    res.writeHead(404);
    res.end();
};

const server = http.createServer(requestListener);
server.listen(config.port, () => {
    console.log(`Server is running on ${config.serviceUrl}`);
});
