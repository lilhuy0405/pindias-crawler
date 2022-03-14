const PandiasServices = require("./PandiasServices");
const scrape = require("./crawler");
const moment = require('moment');
const Toastify = require('toastify-js')
//static HTML elements
const loginPage = document.getElementById('login')
const crawlPage = document.getElementById('crawler')
const loginForm = document.getElementById('login-form')
const loginBtn = document.getElementById('login-btn')
const usernameInput = document.querySelector("#username")
const passwordInput = document.getElementById("password")
const passwordError = document.getElementById("password-error")
const usernameError = document.getElementById("username-error")
const crawlBtn = document.getElementById("crawl-btn")
const crawlMsg = document.getElementById('crawl-message')
const progressBar = document.getElementById('myBar')
const crawlerLoader = document.getElementById("crawler-loader")
const crawlerResult = document.getElementById("crawler-result")
const crawlerSize = document.getElementById('crawl-size')
const logoutBtn = document.getElementById('logout-btn')
const saveBtn = document.getElementById("saveBtn")
//in-memory data
let listCrawledDepartments = []

const emailPattern = /^[\w-\\.]+@([\w-]+\.)+[\w-]{2,4}$/g
const checkLogin = () => {
  return !!localStorage.getItem("token")
}
const validateUsername = value => {
  let isValid
  if (!value || value.length === 0) {
    usernameError.textContent = "Please enter username"
    isValid = false
  } else if (!value.match(emailPattern)) {
    usernameError.textContent = "Email invalid"
    isValid = false
  } else {
    usernameError.textContent = ""
    isValid = true
  }
  return isValid
}
const validatePassword = value => {
  let isValid
  if (!value || value.length === 0) {
    passwordError.textContent = "Please enter password"
    isValid = false
  } else {
    passwordError.textContent = ""
    isValid = true
  }
  return isValid
}
const handleLogin = async (e) => {
  e.preventDefault()
  const pwd = passwordInput.value
  const username = usernameInput.value
  if (!validatePassword(pwd) || !validateUsername(username)) {
    Toastify({
      text: "Check form's values then try again",
      duration: 3000,
      newWindow: true,
      close: true,
      gravity: "top", // `top` or `bottom`
      position: "center", // `left`, `center` or `right`
      stopOnFocus: true, // Prevents dismissing of toast on hover
    }).showToast();
    return
  }
  try {
    loginBtn.textContent = "Logging in..."
    loginBtn.disabled = true;
    await PandiasServices.login(username, pwd)
    render()
    Toastify({
      text: "Welcome back",
      duration: 3000,
      newWindow: true,
      close: true,
      gravity: "top", // `top` or `bottom`
      position: "center", // `left`, `center` or `right`
      stopOnFocus: true, // Prevents dismissing of toast on hover
    }).showToast();
  } catch (err) {
    console.log(err)
  } finally {
    loginBtn.textContent = "Login"
    loginBtn.disabled = false;
  }
}
const handleSetMessage = msg => {

  crawlMsg.innerHTML += `<p>${msg}</p>`

  crawlMsg.scrollTop = 1000
}
const handleUpdateProgress = progress => {
  progressBar.style.width = progress + "%";
  progressBar.textContent = (progress * 1).toFixed(2) + "%";
}
//helper function to change crawled object to api required object
const formatData = (rawData) => {
  return {
    "area": rawData.area,
    "areaUnit": "ACRES",
    "baths": rawData.baths,
    "beds": rawData.beds,
    "contact": "",
    "currency": rawData.currency,
    "detail": JSON.stringify({
      description: rawData.description,
      images: rawData.images
    }),
    "direction": "NORTH",
    "displayLocation": rawData.address,
    "endDate": moment().add(1, 'years').format('YYYY-MM-DD[T]hh:mm:ss'),
    "location": rawData.address,
    "locationMap": rawData.address,
    "name": rawData.name,
    "postType": "REGULAR",
    "price": rawData.price,
    "purpose": "RENT",
    "source": rawData.source,
    "startDate": moment().format('YYYY-MM-DD[T]hh:mm:ss'),
    "thumbnail": rawData.thumbnail,
    "timeZone": 0,
    "type": "APARTMENT"

  }
}
const handleSave = async item => {
  const selected = listCrawledDepartments.find(dp => dp.source === item)
  if (!selected) return
  try {
    await PandiasServices.saveApartment(formatData(selected))
    listCrawledDepartments = listCrawledDepartments.filter(dp => dp.source !== item)
    Toastify({
      text: `⬆️ ${selected.name} ☑️`,
      duration: 3000,
      newWindow: true,
      close: true,
      gravity: "top", // `top` or `bottom`
      position: "center", // `left`, `center` or `right`
      stopOnFocus: true, // Prevents dismissing of toast on hover
    }).showToast();
    renderCrawlData()
  } catch (err) {
    console.log(err)
    Toastify({
      text: "Pushed failed ".concat(err.message),
      duration: 3000,
      newWindow: true,
      close: true,
      gravity: "top", // `top` or `bottom`
      position: "center", // `left`, `center` or `right`
      stopOnFocus: true, // Prevents dismissing of toast on hover
    }).showToast();
  }

}

const handleSaveMultiple = async () => {
  const listCheckbox = document.querySelectorAll(`input[type='checkbox'][name='selectDepartment']`)
  const checkedDepartments = [...listCheckbox].filter(item => item.checked).map(item => {
    const department = listCrawledDepartments.find(dp => dp.source === item.value)
    return department
  })
  if (checkedDepartments.length === 0) {
    Toastify({
      text: `Please select at least one apartment`,
      duration: 3000,
      newWindow: true,
      close: true,
      gravity: "top", // `top` or `bottom`
      position: "center", // `left`, `center` or `right`
      stopOnFocus: true, // Prevents dismissing of toast on hover
    }).showToast();
    return
  }
  await Promise.all(checkedDepartments.map(item => new Promise(async (resolve, reject) => {
    try {
      await PandiasServices.saveApartment(formatData(item))
      listCrawledDepartments = listCrawledDepartments.filter(dp => dp.source !== item.source)
      Toastify({
        text: `⬆️ ${item.name} ☑️`,
        duration: 3000,
        newWindow: true,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
      }).showToast();
      renderCrawlData()
      resolve()
    } catch (err) {
      console.log(err)
      Toastify({
        text: "Pushed failed ".concat(err.message),
        duration: 3000,
        newWindow: true,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
      }).showToast();
      reject()
    }
  })))
}

const handleCheckAll = () => {
  const listCheckbox = document.querySelectorAll(`input[type='checkbox'][name='selectDepartment']`)
  const checkAllInput = document.getElementById('checkAll')
  if (checkAllInput.checked) {
    for (let i = 0; i < listCheckbox.length; i++) {
      listCheckbox[i].checked = true
    }
  } else {
    for (let i = 0; i < listCheckbox.length; i++) {
      listCheckbox[i].checked = false
    }
  }
}

function renderCrawlData() {
  const tableContent = document.getElementById('crawler-table-data')
  tableContent.innerHTML = `
     <tr style="position: sticky; top: 0; z-index: 10; background: #dddddd;">
        <th><input type="checkbox" id="checkAll"></th>
        <th>Name</th>
        <th>Address</th>
        <th>Price</th>
        <th>Area</th>
        <th>Bad - Beds</th>
        <th>Thumbnail</th>
        <th>Action</th>
     </tr>
    `

  listCrawledDepartments.forEach(item => {
    tableContent.innerHTML += `
      <tr>
        <td><input type="checkbox" value="${item.source}" name="selectDepartment"></td>
        <td>${item.name}</td>
        <td>${item.address}</td>
        <td>${item.price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })}
        </td>
        <td>${item.area}</td>
        <td>${item.beds} - ${item.baths}</td>
        <td><img src='${item.thumbnail}' width="70" height="50"/></td>
        <td><button class="push-btn" onclick="handleSave('${item.source}')">
        Push <i class="fa-solid fa-cloud-arrow-up"></i></button>
        </td>
      </tr>
      `
  })
  const checkAllInput = document.getElementById('checkAll')
  checkAllInput.addEventListener('change', handleCheckAll)
}

const handleCrawl = async () => {

  crawlMsg.innerHTML = ''
  const size = crawlerSize.value
  if (size < 0) return
  const sizeNumber = parseInt(size)
  if (isNaN(sizeNumber)) return
  try {
    crawlBtn.disabled = true
    crawlBtn.innerHTML = `Crawling !
                        <div class="loader"></div>`
    crawlerLoader.style.display = 'block'
    crawlerResult.style.display = 'none'
    //update in memory data
    listCrawledDepartments = await scrape(sizeNumber, handleSetMessage, handleUpdateProgress)
    renderCrawlData()
    crawlerLoader.style.display = 'none'
    crawlerResult.style.display = 'block'
  } catch (err) {
    console.log(err)
    handleSetMessage('[ERROR]: '.concat(err.message))
  } finally {
    crawlBtn.disabled = false
    crawlBtn.innerHTML = ` Crawl ! <i class="fa-solid fa-robot" style="margin-left: 10px"></i>`
  }
}
const render = () => {
  const isLogin = checkLogin()
  console.log(isLogin)
  if (isLogin) {
    loginPage.style.display = 'none'
    crawlPage.style.display = 'block'
  } else {
    loginPage.style.display = 'block'
    crawlPage.style.display = 'none'
  }
}
const handleUsernameChange = e => {
  validateUsername(e.target.value)
}
const handlePwdChange = e => {
  validatePassword(e.target.value)
}
const handleLogout = () => {
  localStorage.removeItem('token')
  render()
}
// bind event
loginForm.addEventListener('submit', handleLogin)
usernameInput.addEventListener('keyup', handleUsernameChange)
passwordInput.addEventListener("keyup", handlePwdChange)
crawlBtn.addEventListener('click', handleCrawl)
saveBtn.addEventListener('click', handleSaveMultiple)

//logoutBtn.addEventListener('click', handleLogout)
//first render
render()
