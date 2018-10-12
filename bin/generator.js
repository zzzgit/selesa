const fs = require("fs")
const path = require("path")

let filename = null
if (process.argv[2]==="upload"){
    filename = "upload"
}else{
    filename = "download"
}
let gql = fs.readFileSync(path.resolve(__dirname, `./${filename}.gql`), { encoding: "UTF-8" });
let obj = { query: gql}
console.log(JSON.stringify(obj))
