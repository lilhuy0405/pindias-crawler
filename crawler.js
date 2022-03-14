const puppeteer = require("puppeteer");

async function scrape(crawlerSize, onSetMessages, onUpdateProgress) {
  const browser = await puppeteer.launch();
  // crawl urls
  onSetMessages("🤖: Start crawling urls...")
  onUpdateProgress(10)
  const urls = await getDetailUrs(browser, crawlerSize, onSetMessages);
  onUpdateProgress(20)
  onSetMessages("🤖: Start crawling department infos...")
  let currentProgress = 20
  const progressShift = (100 - 20) / urls.size
  const listDepartments = await Promise.all([...urls].map((url) => {
    return new Promise(async (resolve, reject) => {
      try {
        const department = await crawlImmobileData(browser, url)
        console.log(department)
        onSetMessages(`🤖: 🏠 ${department.name} ☑️`)
        currentProgress += progressShift
        onUpdateProgress(currentProgress)
        resolve(department);
      } catch (err) {
        console.error(err);
        onSetMessages("🚫".concat(err.message))
        reject(err);
      }
    });
  }));
  onSetMessages("All done  ☑️")
  onUpdateProgress(100)
  await browser.close();
  return listDepartments
}

const getDetailUrs = async (browser, crawlerSize, onSetMessage) => {
  const urls = new Set();
  let pageNumber = 1
  while (true) {
    const page = await browser.newPage();

    await page.goto(`https://thechadcarrollgroup.com/sold/?pg=${pageNumber}`, {
      timeout: 0
    });
    onSetMessage(`🤖: 🔎 https://thechadcarrollgroup.com/sold/?pg=${pageNumber}`)
    const elements = await page.$$("div.ml-single-fp a.ml-fp-vd");

    for (let i = 0; i < elements.length; i++) {
      try {
        const url = await page.evaluate((item) => item.href, elements[i]);
        onSetMessage(`🤖: 👉 ${url}`)
        urls.add(url)
        if (urls.size === crawlerSize) {
          return urls
        }
      } catch (err) {
        console.log(err)
      }
    }
    pageNumber++;
    page.close()
  }

};

const crawlImmobileData = async (browser, url) => {
  const nameSelector = "div.ld-info-title.font-pra h1>span:first-child"
  const descriptionSelector = ".ld-info .ld-info-l p";
  const priceSelector = ".ld-det .ld-det-price";
  const addressSelector = ".ld-det .ld-det-add"
  const featSelector = ".ld-det .ld-feat"
  const bedBathSelector = ".ld-det .ld-det-bb"
  const listImagesSelector = ".ld-slideshow .slick-list.draggable .ld-single-slide canvas"
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: 'load', // Remove the timeout
    timeout: 0
  });

  const des = await getElementTextContent(page, descriptionSelector)
  const price = await getElementTextContent(page, priceSelector)
  const address = await getElementTextContent(page, addressSelector)
  const name = await getElementTextContent(page, nameSelector)
  const feat = await getElementTextContent(page, featSelector)
  const bedBath = await getElementTextContent(page, bedBathSelector)
  //get images
  const canvas = await page.$$(listImagesSelector);
  const images = []
  await Promise.all(canvas.map((item) => {
    return new Promise(async (resolve, reject) => {
      try {
        const url = await page.evaluate((item) => item.style.backgroundImage.slice(4, -1).replace(/"/g, ""), item)
        images.push(url.trim());
        resolve();
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  }));
  page.close()
  const areaAndType = extractAreaAndType(feat)
  return {
    ...areaAndType,
    description: des.trim(),
    price: +extractNumberFromString(price).replace(/,/g, ''),
    currency: "USD",
    address: address.replace("Address: ", ""),
    beds: +searchDataByKeyword(bedBath, "Beds: "),
    baths: +searchDataByKeyword(bedBath, "Baths: "),
    name: name.trim(),
    images,
    thumbnail: images.length > 0 ? images[0] : '',
    source: url
  }
};

const extractNumberFromString = text => {
  return text.replace(/^\D+/g, '')
}

const extractAreaAndType = (feat) => {
  //remove all new line and extra space between words
  const res = feat.replace(/\r?\n|\r/g, " ").replace(/ +(?= )/g, '').replace("Waterfront:", "");
  const area = searchDataByKeyword(res, "Living Area: ")
  const type = searchDataByKeyword(res, "Property Type: ")
  const areaNumber = isNaN(parseFloat(area.replace(/,/g, ""))) ? 0 : parseFloat(area.replace(/,/g, ""))
  return {
    area: areaNumber, type: type.trim()
  }

}
const searchDataByKeyword = (text, keyword) => {
  const res = []
  const startIndex = text.indexOf(keyword) + keyword.length
  for (let i = startIndex; i < text.length; i++) {
    res.push(text[i])
    if (text[i] === ' ') break;
  }
  return res.join("")
}

const getElementTextContent = async (page, selector) => {
  const element = await page.$(selector);
  if (!element) {
    console.log("not found");
    return null;
  }
  const content = await page.evaluate(el => el.textContent, element)
  return content
}

module.exports = scrape



