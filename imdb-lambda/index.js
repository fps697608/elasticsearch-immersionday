const ES_DOMAIN = process.env.domain;
const REGION = "ap-southeast-2";
const AWS = require('aws-sdk');
AWS.config.update({
  region: REGION
});

// Load the Elasticsearch Client
const esclient = require('elasticsearch').Client({
    hosts: [ ES_DOMAIN ],
    connectionClass: require('http-aws-es'),    // Connects to ES using SigV4 signed request
    log: 'trace'
  });


function search(criteria) {
    /*
        Elasticsearch JS API Docs: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html
        Simple Query Search: 
            esclient.search({
                q: 'Start Wars'
            })

        Specific Search: 
            client.search({
                index: 'imdb',
                type: 'movie',
                body: {
                    query: {
                        match: {
                            title: 'Star Wars'
                        }
                    }
                }
            })


        Tailored Search:
        query: {
           bool: {
                should: [
                    { 
                        match: {
                            name:  {
                                query: query,
                                boost: 4
                            }
                        }
                    },
                    { 
                        match: {
                            name:  {
                                query: query,
                                boost: 4
                            }
                        }
                    },
                    { 
                        match: {
                            description:  {
                                query: query,
                                boost: 1.2
                            }
                        }
                    },
                    { 
                        match: {
                            track:  {
                                query: query,
                                boost: 1.4
                            }
                        }
                    },
                    { 
                        match: {
                            speaker:  {
                                query: query,
                                boost: 2
                            }
                        }
                    }
                ]
           }
        }
     }
    */
    return esclient.search({ q:criteria });
}

function handleSearchResults(results) {
    /*
        { 
            took: 84, 
            timed_out: false, 
            _shards: { total: 6, successful: 6, skipped: 0, failed: 0 }, 
            hits: { 
                total: 123456,
                max_score: 20.87, 
                hits: []
            }
        }
    */
   if (results.timed_out) {
       throw new Error("Timed out searching for movies");
   }

   if (results.hits.total > 0) {
       console.log("Best Result:", JSON.stringify(results.hits.hits[0], null, 2));
       return results.hits;
   } else {
        console.log("No Matches found!");
        return results.hits;
   }
}


function liftSourceField(doc) {
    var source = doc._source;
    var actorsToMove = [];
    for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
            doc[prop] = source[prop];

            if (prop === "actors" && doc[prop] && doc[prop].length > 0) {
                doc[prop].forEach(actor => {
                    if (!actor.characters || actor.characters.length == 0 || !actor.characters[0]) {
                        // Move into crew!
                        actorsToMove.push(actor);
                    }
                });
            }
        }
    }

    // Move directors into crew...
    actorsToMove.forEach(actor => {
        actor.job = "director?";
        doc["crew"].push(actor);
        doc["actors"] = doc["actors"].filter(item => item !== actor);
    });

    delete doc._source;
}

function liftHits(hits) {
    hits.forEach(hit => {
        liftSourceField(hit);
    });
}

exports.handler = (event, context, callback) => {
    // console.log('Received event:', JSON.stringify(event, null, 2));
    var origin = event.headers.origin || event.headers.Origin;
    var criteria = event.queryStringParameters.criteria;

    search(criteria)
    .then(handleSearchResults)
    .then(results => {
        liftHits(results.hits);
        return results;
    })
    .then(data => {
        callback(null, {
            statusCode:'200',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin,
            }
        });
    })
    .catch(err => {
        callback(null, {
            statusCode: '500',
            body: err.message,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin, 
            },
        });
        })
        ;
};