const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const WebSocket = require('ws');

ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler để Render Video bằng FFMPEG
ipcMain.handle('render-video', async (event, scenes, outputFileName) => {
  return new Promise((resolve, reject) => {
    try {
      const outputPath = path.join(app.getPath('downloads'), outputFileName || 'hero-video.mp4');
      
      // Xử lý tạo lệnh FFMPEG phức tạp từ scenes (ảnh tĩnh + thời gian)
      let command = ffmpeg();
      
      let filterComplex = '';
      let concatInputs = '';

      scenes.forEach((scene, index) => {
        // Ta quy định scene.imagePath là đường dẫn local đã tải xuống (renderer phải tự tải trước)
        command = command.input(scene.imagePath);
        command = command.inputOptions([`-loop 1`, `-t ${scene.duration || 5}`]);
        
        filterComplex += `[${index}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}];`;
        concatInputs += `[v${index}]`;
      });

      filterComplex += `${concatInputs}concat=n=${scenes.length}:v=1:a=0[v]`;

      command
        .complexFilter(filterComplex, ['v'])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30'
        ])
        .save(outputPath)
        .on('progress', (progress) => {
          if (mainWindow) {
            mainWindow.webContents.send('render-progress', progress.percent);
          }
        })
        .on('end', () => {
          resolve({ success: true, path: outputPath });
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject({ success: false, error: err.message });
        });
        
    } catch (err) {
      reject({ success: false, error: err.message });
    }
  });
});

// Helper chọn thư mục
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

// ============================================
// WEBSOCKET SERVER CHO WEB APP GIAO TIẾP (PORT 3001)
// ============================================
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  console.log('[WebSocket] Web App connected!');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start_render') {
        const { scenes, outputFileName } = data.payload;
        console.log('[WebSocket] Starting render:', outputFileName);
        
        const outputPath = path.join(app.getPath('downloads'), outputFileName || 'hero-video-ws.mp4');
        let command = ffmpeg();
        let filterComplex = '';
        let concatInputs = '';

        scenes.forEach((scene, index) => {
          command = command.input(scene.imagePath);
          command = command.inputOptions([`-loop 1`, `-t ${scene.duration || 5}`]);
          filterComplex += `[${index}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}];`;
          concatInputs += `[v${index}]`;
        });

        filterComplex += `${concatInputs}concat=n=${scenes.length}:v=1:a=0[v]`;

        command
          .complexFilter(filterComplex, ['v'])
          .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-r 30'])
          .save(outputPath)
          .on('progress', (progress) => {
            // Gửi % render về web app
            ws.send(JSON.stringify({ type: 'progress', percent: progress.percent }));
          })
          .on('end', () => {
            ws.send(JSON.stringify({ type: 'done', path: outputPath }));
          })
          .on('error', (err) => {
            console.error('[WebSocket] FFmpeg error:', err);
            ws.send(JSON.stringify({ type: 'error', error: err.message }));
          });
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', error: 'Lỗi xử lý yêu cầu' }));
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Web App disconnected');
  });
});

console.log('[WebSocket] Server running on ws://localhost:3001');
