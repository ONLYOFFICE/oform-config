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
            let requestUrl = config.configsUrl + (config.configsUrl.slice(-1) == '/' ? 'data/def.json' : '/data/def.json');
            urllib.request(requestUrl, {method: "GET"}, (err, data) => {
                if (data) {
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


const configHandler = async function (req, res, params) {
    await getDefJson().then((result) => {
        filesDict = result;
    });

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

    let docConfig = {
        document: {
            fileType: "oform",
            title: doc.name,
            url: doc.link_oform_filling_file,
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