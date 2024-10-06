// for routing
var express = require("express");
var router = express.Router();

router.get("/", function(req, res){
    console.log("main");
    res.render("main");
})
router.get("/balance", function(req, res){
    console.log("balance");
    res.render("balance");
})
router.get("/profile", function(req, res){
    console.log("profile");
    res.render("profile");
})
const puppeteer = require("puppeteer");

// define route to render scraped data
router.get("/scrape", async(req, res) => {
    console.log("scraping!");
    try
    {   
        // launch Puppeteer and open new browser instance
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // enable request interception
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
                request.abort(); // abort request for images & stylesheets
            } else {
                request.continue(); // continue with other requests
            }
        });

        // function to scrape dining halls from specified URL & selector
        const scrapeDiningHalls = async (url, selector) => {
            // navigate to Columbia dining webpage
            await page.goto(url, { waitUntil: "domcontentloaded" }); // ensure DOM is loaded
            await page.waitForSelector(selector);

            // select elements containing dining hall names
            return await page.evaluate((selector) => {
                const items = [];
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    items.push(element.textContent.trim());
                });
                return items;
            }, selector);
        };

        // scrape from Columba & Barnard dining webpages
        const columbiaHalls = await scrapeDiningHalls("https://dining.columbia.edu/", 
            `.location.clearfix.dining-location.open .name a, 
             .location.clearfix.retail-location.open .name a`
        );
        const barnardHalls = await scrapeDiningHalls("https://dineoncampus.com/barnard",
            ".row.whats-open-tile_hours_8qXHw .whats-open-tile_locationName_26Mtj"
        );
        
        // combine data
        const openDiningHalls = [...columbiaHalls, ...barnardHalls];
        console.log("Open dining halls:", openDiningHalls);

        // close the browser
        await browser.close();

        // send data to scrape.ejs template to display
        res.render("scrape", { openDiningHalls });
    }
    catch (error)
    {
        console.error(error);
        res.status(500).send('Error scraping data');
    }
});

module.exports = router; 
