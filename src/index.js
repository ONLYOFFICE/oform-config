const http = require("http");
const jwt = require("jsonwebtoken");

const config = require("./config.json");
const filesDef = require("./def.json");
const filesDict = {};

for (var i in filesDef) {
    let doc = filesDef[i];
    filesDict[doc.id] = doc;
}

const configHandler = function (req, res, params) {
    let docId = params[0];
    if (!docId || !filesDict[docId]) {
        res.writeHead(404);
        res.end();
        return;
    }

    let doc = filesDict[docId];

    res.setHeader("Content-Type", "application/json");
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
            callbackurl: config.serviceUrl + "/callback"
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