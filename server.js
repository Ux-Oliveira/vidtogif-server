const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('video'), (req, res) => {
  const input = req.file.path;
  const output = input + '.gif';

  ffmpeg.ffprobe(input, (err, data) => {
    const duration = data.format.duration;
    const speed = duration / 10;

    ffmpeg(input)
      .videoFilters([`setpts=PTS/${speed}`, 'fps=15', 'scale=480:-1'])
      .toFormat('gif')
      .save(output)
      .on('end', () => {
        res.download(output, 'converted.gif', () => {
          fs.unlinkSync(input);
          fs.unlinkSync(output);
        });
      });
  });
});

app.listen(3000, () => console.log('FFmpeg server running on 3000'));
