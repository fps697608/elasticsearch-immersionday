
const argv = require('yargs')
                .option('domain', {
                    alias: 'h',
                    describe: 'Elasticsearch domain (including protocol)', 
                    demandOption: true
                })
                .option('key', {
                    alias: 'k',
                    describe: 'AWS Access Key', 
                    demandOption: true
                })
                .option('secret', {
                    alias: 's',
                    describe: 'AWS Secret Key', 
                    demandOption: true
                })
                .option('region', {
                    alias: 'r',
                    describe: 'The Region of the Elasticsearch domain',
                    default: "ap-southeast-2"
                })
                .option('index', {
                    alias: 'i',
                    describe: 'Name of the index',
                    default: "imdb"
                })
                .option('buffer', {
                    alias: 'b',
                    describe: 'Number of documents to post per bulk request', 
                    default: 1000,
                    type: "number"
                })
                .option('ingest-file', {
                    alias: 'f',
                    describe: 'The file to ingest into Elasticsearch',
                    demandOption: true
                })
                .option('start-doc', {
                    alias: 'd',
                    describe: 'The document index to start from (skipping all documents prior in the ingest file)',
                    default: 0,
                    type: "number"
                })
                .argv

const ES_DOMAIN = argv.domain
const ACCESS_KEY = argv.key;
const SECRET_KEY = argv.secret;
const REGION = argv.region;
const INDEX_NAME = argv.index;
const BUFFER_THRESHOLD = (argv.buffer * 2);
const INGEST_FILE = argv.f;
const START_FROM = argv.d;

console.log("     Domain:", ES_DOMAIN);
console.log(" Access Key:", ACCESS_KEY);
console.log(" Secret Key:", SECRET_KEY);
console.log("     Region:", REGION);
console.log("      Index:", INDEX_NAME);
console.log("     Buffer:", BUFFER_THRESHOLD);
console.log("Ingest File:", INGEST_FILE);
console.log("  Start Doc:", START_FROM);

/* *********** */

const fs = require('fs');
const readline = require('readline');

/** SETUP THE AWS CREDENTIALS + ES CLIENT */
const AWS = require('aws-sdk');
AWS.config.update({
  credentials: new AWS.Credentials(ACCESS_KEY, SECRET_KEY),
  region: REGION
});

// Load the Elasticsearch Client
const esclient = require('elasticsearch').Client({
    hosts: [ ES_DOMAIN ],
    connectionClass: require('http-aws-es'),    // Connects to ES using SigV4 signed request
    log: 'info'
  });


// Naive write lock
let writeLock = false;
let postedDocCounter = 0;
let currentDocIndex = 0;


// This function posts the buffer of operations + documents to the bulk API of Elasticsearch
// On error, it will pause 5s and then try again
function postBuffer(buffer, cb) {
    let buff = buffer;
    let sample_doc = buff[buff.length - 1];
    
    let retryCounter = 0;
    let callback = (err, resp) => {
        if (err) {
            console.log("[" + currentDocIndex + ":" + sample_doc.type + ":" + sample_doc.id + "] Error Posting!", err.message);
            setTimeout( () => {
                posting_func();
            }, 5000);
        } else {
            postedDocCounter += Math.floor(buff.length/2);
            console.log("[" + currentDocIndex + ":"  + sample_doc.type + ":" + sample_doc.id + "] SUCCESS! (" + postedDocCounter + " docs posted)");
            cb();
        };
    };

    let posting_func = () => {
        if (retryCounter++ > 0) {
            console.log("[" + currentDocIndex + ":" + sample_doc.type + ":" + sample_doc.id + ", Attempt: " + retryCounter + "] Attempting to Post " + Math.floor(buff.length/2) + " documents to ES");
        } else {
            console.log("[" + currentDocIndex + ":" + sample_doc.type + ":" + sample_doc.id + "] Attempting to Post " + Math.floor(buff.length/2) + " documents to ES");
        }            
        esclient.bulk({ body: buff }, callback);
    }

    posting_func();
}


if (fs.existsSync(INGEST_FILE)) {
    let buffer = [];
    const rl = readline.createInterface({
        input: fs.createReadStream(INGEST_FILE),
      });
      
      rl.on('line', (line) => {
        // Function to get the write lock for the buffer
        let aquireLockAndProcessLine = () => {
            if (!writeLock) {
                writeLock = true;
                processLine();
            } else {
                setTimeout(aquireLockAndProcessLine, 1);
            }
        }

        let processLine = () => {
            // Pause the reader whilse we're writing out the bulk upload json
            rl.pause();

            if (line.indexOf("{") != -1) {
                if (currentDocIndex++ > START_FROM) {
                    let doc = JSON.parse(line);
                    // Buffer needs to records per document: 
                    //  - Metadata record, indicating that we're indexing the following record
                    //  - Record to be indexed
                    buffer.push( { index:  { _index: INDEX_NAME, _type: doc.type } } );
                    buffer.push(doc);
    
                    // If the buffer is full, then post it
                    if (buffer.length >= BUFFER_THRESHOLD) {
                        let postBuff = buffer;
                        buffer = [];
                        postBuffer(postBuff, () => {
                            writeLock = false;
                            rl.resume();
                        })
                    } else {    // Buffer not full yet - move on...
                        writeLock = false;
                        rl.resume();
                    }
                } else {
                    // Skipping document...
                    writeLock = false;
                    rl.resume();
                }
            } else {    // Not a document, ignore the line...
                writeLock = false;
                rl.resume();
            }
        }

        // First step is to aquire the lock (function will then call processLine to actually process the line)...
        aquireLockAndProcessLine();
      });
} else {
    console.log("Specified file: " + INGEST_FILE + " does not exist.");
    process.exit(1);
}

