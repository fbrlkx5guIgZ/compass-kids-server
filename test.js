const resp = await fetch("https://www.ebanxue.com/Vapp/Book/getBookSource", {
  "headers": {
    "accept": "*/*",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded",
    "pragma": "no-cache"
  },
  "referrer": "https://servicewechat.com/wx0a18859ca67ace5a/devtools/page-frame.html",
  "referrerPolicy": "strict-origin-when-cross-origin",
  "body": "bookid=1682",
  "method": "POST",
  "mode": "cors"
})
console.log(resp.status)