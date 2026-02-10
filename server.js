const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.options('*', cors());

const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('video'), (req, res) => {
  const input = req.file.path;
  const output = input + '.gif';

  ffmpeg.ffprobe(input, (err, data) => {
    const duration = data.format.duration;

    if (duration > 180) {
      fs.unlinkSync(input);
      return res.status(400).send('Video too long');
    }

    let command = ffmpeg(input)
      .setStartTime(0)
      .duration(10); // always cut to 10s first

    if (duration > 10) {
      // REAL SPEED UP (this is what was missing)
      const speedFactor = duration / 10;

      command = command.outputOptions([
        `-filter:v setpts=${1 / speedFactor}*PTS,fps=12,scale=360:-1`
      ]);
    } else {
      // FAST PATH — no time manipulation
      command = command.outputOptions([
        '-vf fps=12,scale=360:-1'
      ]);
    }

    command
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
