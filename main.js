const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron')
const path = require('path')
const fs = require('fs')
const fetch = require('node-fetch')
const FormData = require('form-data')
require('dotenv').config();

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
}

function getJakartaTimestamp() {
  const jakartaTime = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Jakarta',
  });
  
  const date = new Date(jakartaTime);
  
  // Format: YYYY-MM-DD-HH-mm-ss
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

app.whenReady().then(createWindow)

// Handler untuk mengambil screenshot
ipcMain.handle('capture-screenshot', async (event, sessionId) => {
  try {
    // Ambil screenshot
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    
    const screenshot = sources[0].thumbnail.toDataURL()
    const timestamp = getJakartaTimestamp()
    console.log('Generated timestamp:', timestamp)
    const tempPath = path.join(__dirname, 'temp', `screenshot-${timestamp}.png`)
    
    // Buat direktori temp jika belum ada
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'))
    }
    
    // Simpan screenshot sementara
    const base64Data = screenshot.replace(/^data:image\/png;base64,/, "")
    fs.writeFileSync(tempPath, base64Data, 'base64')
    
    // Upload ke server
    const formData = new FormData()
    formData.append('screenshot', fs.createReadStream(tempPath))
    formData.append('sessionId', sessionId)

    const API_URL = process.env.API_URL;

    const response = await fetch(`${API_URL}/api/v1/upload-screenshot`, {
      method: 'POST',
      body: formData,
    });

    // Hapus file temporary
    fs.unlinkSync(tempPath)

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error capturing/uploading screenshot:', error)
    throw error
  }
})
