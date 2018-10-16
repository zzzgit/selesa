const { execFile } = require('child_process')


execFile('sh', [path.resolve(__dirname, './upload.sh')], (error) => {
    if (error) {
        logger.error(`[selesa]: ${error}`)
        throw error
    }
    process.exit(0)
})

let child = execFile('sh', [path.resolve(__dirname, './download.sh'), "--foo bar"], { aaa: "bbb" }, (error, stdout, stderr) => {
    if (error) {
        throw error
    }
    console.log(stdout);
    //process.exit(0)
})