'use strict';

import fetch from "node-fetch";
import converter from "rel-to-abs";
import fs from "fs";
import ResponseBuilder from "./app/ResponseBuilder.js";

const index = fs.readFileSync('index.html', 'utf8');

export default app => {
    app.get('/*', (req, res) => {
        const responseBuilder = new ResponseBuilder(res);

        let requestedUrl = req.url.slice(1);
        const corsBaseUrl = '//' + req.get('host');

        console.info(requestedUrl);

        if (requestedUrl === '') {
            res.send(index);
            return;
        }

        let headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
        };

        // if the request does not start with an url
        if (!requestedUrl.startsWith("http")) {
            // extract the first part of the request url
            const urlParts = requestedUrl.split('/');
            const serializedHeaders = urlParts[0];
            requestedUrl = urlParts.slice(1).join("/");

            // supposedly, the first part should contain "&" separated headers to put on the request
            serializedHeaders.split("&").forEach(serializedHeader => {
                const header = serializedHeader.split("=");
                const key = decodeURIComponent(header[0]);
                const value = decodeURIComponent(header[1]);
                headers[key] = value;
            })
        }

        fetch(requestedUrl, {
            method: 'GET',
            headers: headers
        }).then(async originResponse => {
            // add all headers of the original response but content-encoding. gzip is trouble.
            originResponse.headers.forEach((value, name) => {
                if (name !== 'content-encoding') {
                    res.setHeader(name, value);
                }
            });
            // replace cors headers
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Credentials', false)
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            if (req.headers['rewrite-urls']) {
                res.send(
                    converter
                        .convert(await originResponse.text(), requestedUrl)
                        .replace(requestedUrl, corsBaseUrl + '/' + requestedUrl)
                );
            } else {
                originResponse.body.pipe(res);
            }
        }).catch(originResponse => {
            responseBuilder
                .addHeaderByKeyValue('Access-Control-Allow-Origin', '*')
                .addHeaderByKeyValue('Access-Control-Allow-Credentials', false)
                .addHeaderByKeyValue('Access-Control-Allow-Headers', 'Content-Type')
                .addHeaderByKeyValue('X-Proxied-By', 'cors-containermeh')
                .build(originResponse.headers);

            res.status(originResponse.statusCode || 500);

            return res.send(originResponse.message);
        });

    });
};
