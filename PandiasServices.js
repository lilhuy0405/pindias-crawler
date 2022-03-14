const API_URL = require("./constants");


const PandiasServices = {
  login: async (email, password) => {
    const url = 'https://dev.diasplat.com/auth/login'
    const response = await fetch(`${url}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({email, password})
    })
    if (!response.ok) {
      throw new Error("Login failed")
    }
    const token = await response.text()
    localStorage.setItem("token", token)
  },
  saveApartment: async (data) => {
    const token = localStorage.getItem("token")
    const url = 'https://dev.diasplat.com/api/real-estate/create'
    const response = await fetch(`${url}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '.concat(token)
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error("post failed")
    }
  }
}
module.exports = PandiasServices
